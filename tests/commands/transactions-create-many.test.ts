import { mkdtempSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const apiRequest = vi.fn();
const outputSuccess = vi.fn();

vi.mock("../../src/lib/api-client.js", () => ({ apiRequest }));
vi.mock("../../src/lib/output.js", () => ({
  output: { success: outputSuccess, error: vi.fn() },
}));
vi.mock("../../src/lib/resolve.js", () => ({
  resolveAccount: async (ref: string) => {
    if (ref === "Nope") {
      const { CliError } = await import("../../src/lib/errors.js");
      throw new CliError({ code: "NOT_FOUND", message: "No account" });
    }
    return { id: `acc_${ref.toLowerCase()}`, name: ref, currency: "PEN" };
  },
  resolveCategory: async (ref: string) => ({ id: `cat_${ref.toLowerCase()}` }),
}));
vi.mock("../../src/lib/effects.js", () => ({
  accountsAfterWrite: async (ids: string[]) => ids.map((id) => ({ id })),
}));

const { bulkRequests, createManyTransactionsCommand, planBulk } =
  await import("../../src/commands/transactions/create-many.js");

const dir = mkdtempSync(join(tmpdir(), "lucas-create-many-"));

function file(items: unknown): string {
  const path = join(dir, `${Math.random()}.json`);
  writeFileSync(path, JSON.stringify(items));
  return path;
}

const items = [
  {
    account: "Soles",
    type: "expense",
    amount: 12.5,
    description: "Taxi",
    category: "Transport",
    date: "2026-09-01",
  },
  {
    account: "Visa",
    type: "EXPENSE",
    amount: "40",
    description: "Cena",
    date: "2026-09-02",
  },
  {
    account: "Soles",
    type: "INCOME",
    amount: 100,
    description: "Reembolso",
    date: "2026-09-03",
    notes: "Viaje Cusco",
  },
];

describe("transactions create-many", () => {
  beforeEach(() => {
    apiRequest.mockReset();
    outputSuccess.mockReset();
  });

  it("groups items per account in batches of at most 50", async () => {
    const planned = await planBulk(
      Array.from({ length: 51 }, () => ({
        account: "Soles",
        type: "EXPENSE",
        amount: 1,
        description: "x",
        date: "2026-09-01",
      })),
    );
    const requests = bulkRequests(planned);

    expect(requests.map((r) => r.indexes.length)).toEqual([50, 1]);
    expect(requests[1].indexes).toEqual([50]);
  });

  it("validates every item before sending anything", async () => {
    await expect(
      createManyTransactionsCommand.parseAsync(
        [
          "--file",
          file([
            items[0],
            { account: "Nope", type: "EXPENSE", amount: 1, description: "a" },
            { account: "Soles", type: "GIFT", amount: 1, description: "b" },
            {
              account: "Soles",
              type: "EXPENSE",
              amount: 1,
              description: "c",
              date: "2026-09-01T10:00",
            },
            {
              account: "Soles",
              type: "EXPENSE",
              amount: 1,
              description: "d",
              notes: 5,
            },
          ]),
        ],
        { from: "user" },
      ),
    ).rejects.toMatchObject({
      code: "INVALID_VALUE",
      details: {
        errors: [
          expect.objectContaining({ index: 1, code: "NOT_FOUND" }),
          expect.objectContaining({ index: 2 }),
          expect.objectContaining({ index: 3 }),
          expect.objectContaining({ index: 4 }),
        ],
      },
    });
    expect(apiRequest).not.toHaveBeenCalled();
  });

  it("prints every bulk request on --dry-run", async () => {
    await createManyTransactionsCommand.parseAsync(
      ["--file", file(items), "--dry-run"],
      { from: "user" },
    );

    expect(apiRequest).not.toHaveBeenCalled();
    const [payload] = outputSuccess.mock.calls[0];
    expect(payload).toMatchObject({ dryRun: true, items: 3 });
    expect(payload.requests).toEqual([
      {
        method: "POST",
        path: "/api/transactions/bulk",
        body: {
          accountId: "acc_soles",
          items: [
            {
              date: "2026-09-01",
              amount: 12.5,
              type: "EXPENSE",
              description: "Taxi",
              categoryId: "cat_transport",
            },
            {
              date: "2026-09-03",
              amount: 100,
              type: "INCOME",
              description: "Reembolso",
              notes: "Viaje Cusco",
            },
          ],
        },
      },
      {
        method: "POST",
        path: "/api/transactions/bulk",
        body: {
          accountId: "acc_visa",
          items: [
            {
              date: "2026-09-02",
              amount: 40,
              type: "EXPENSE",
              description: "Cena",
            },
          ],
        },
      },
    ]);
  });

  it("returns created views, skipped with original indexes and balances after", async () => {
    apiRequest
      .mockResolvedValueOnce({
        created: [{ id: "t1", amount: "12.5", accountId: "acc_soles" }],
        skipped: [
          { index: 1, reason: "DUPLICATE_EXISTING", existingId: "old" },
        ],
      })
      .mockResolvedValueOnce({
        created: [{ id: "t2", amount: "40", accountId: "acc_visa" }],
        skipped: [],
      });

    await createManyTransactionsCommand.parseAsync(["--file", file(items)], {
      from: "user",
    });

    const [payload] = outputSuccess.mock.calls[0];
    expect(payload.created).toEqual([
      expect.objectContaining({ id: "t1", amount: 12.5 }),
      expect.objectContaining({ id: "t2", amount: 40 }),
    ]);
    expect(payload.skipped).toEqual([
      { index: 2, reason: "DUPLICATE_EXISTING", existingId: "old" },
    ]);
    expect(payload.accounts).toEqual([{ id: "acc_soles" }, { id: "acc_visa" }]);
  });

  it("rejects a file that is not a JSON array", async () => {
    await expect(
      createManyTransactionsCommand.parseAsync(["--file", file({ a: 1 })], {
        from: "user",
      }),
    ).rejects.toMatchObject({ code: "INVALID_VALUE" });
  });
});
