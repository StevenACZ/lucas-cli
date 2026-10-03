import { beforeEach, describe, expect, it, vi } from "vitest";

const apiRequest = vi.fn();
const success = vi.fn();

vi.mock("../../src/lib/api-client.js", () => ({ apiRequest }));
vi.mock("../../src/lib/output.js", () => ({
  output: { success, error: vi.fn() },
}));

const ACTIVE = [
  { id: "acc_soles", name: "Soles", bank: "BCP", type: "DEBIT" },
  { id: "acc_visa", name: "Visa Signature", bank: "BCP", type: "CREDIT" },
  { id: "acc_cash", name: "Efectivo", bank: "Cash", type: "CASH" },
];
const ARCHIVED = [
  { id: "acc_old", name: "Old Wallet", bank: "Yape", isArchived: true },
];

function stubApi(archived: unknown[] = ARCHIVED) {
  apiRequest.mockImplementation(
    async (
      method: string,
      path: string,
      _body?: unknown,
      params?: Record<string, string>,
    ) => {
      if (method !== "GET") return { success: true };
      if (path === "/api/accounts") return { accounts: ACTIVE };
      if (path === "/api/accounts/archived") {
        const offset = Number(params?.offset ?? 0);
        const limit = Number(params?.limit ?? 50);
        return archived.slice(offset, offset + limit);
      }
      return {};
    },
  );
}

function writes() {
  return apiRequest.mock.calls.filter(([method]) => method !== "GET");
}

const load = {
  reorder: async () =>
    (await import("../../src/commands/accounts/reorder.js"))
      .reorderAccountsCommand,
  convertType: async () =>
    (await import("../../src/commands/accounts/convert-type.js"))
      .convertAccountTypeCommand,
  permanentDelete: async () =>
    (await import("../../src/commands/accounts/permanent-delete.js"))
      .permanentDeleteAccountCommand,
  emptyArchive: async () =>
    (await import("../../src/commands/accounts/permanent-delete.js"))
      .emptyArchiveCommand,
  list: async () =>
    (await import("../../src/commands/accounts/list.js")).listAccountsCommand,
};

async function run(name: keyof typeof load, args: string[]) {
  vi.resetModules();
  const command = await load[name]();
  await command.parseAsync(args, { from: "user" });
}

beforeEach(() => {
  apiRequest.mockReset();
  success.mockReset();
  stubApi();
});

describe("accounts reorder", () => {
  it("resolves names and ids into positions in the listed order", async () => {
    await run("reorder", ["Efectivo", "acc_soles", "visa"]);

    expect(writes()).toEqual([
      [
        "PUT",
        "/api/accounts/reorder",
        {
          orders: [
            { id: "acc_cash", displayOrder: 0 },
            { id: "acc_soles", displayOrder: 1 },
            { id: "acc_visa", displayOrder: 2 },
          ],
        },
      ],
    ]);
    expect(success).toHaveBeenCalledWith({
      reordered: [
        { id: "acc_cash", name: "Efectivo", displayOrder: 0 },
        { id: "acc_soles", name: "Soles", displayOrder: 1 },
        { id: "acc_visa", name: "Visa Signature", displayOrder: 2 },
      ],
    });
  });

  it("keeps the accounts left out after the listed ones", async () => {
    await run("reorder", ["visa"]);

    expect(writes()).toEqual([
      [
        "PUT",
        "/api/accounts/reorder",
        {
          orders: [
            { id: "acc_visa", displayOrder: 0 },
            { id: "acc_soles", displayOrder: 1 },
            { id: "acc_cash", displayOrder: 2 },
          ],
        },
      ],
    ]);
  });

  it("rejects an account listed twice", async () => {
    await expect(run("reorder", ["Soles", "acc_soles"])).rejects.toMatchObject({
      code: "INVALID_VALUE",
    });
    expect(writes()).toEqual([]);
  });
});

describe("accounts convert-type", () => {
  it("--dry-run prints the request and writes nothing", async () => {
    await run("convertType", [
      "Soles",
      "--type",
      "credit",
      "--credit-limit",
      "5000",
      "--statement-closing-day",
      "20",
      "--dry-run",
    ]);

    expect(writes()).toEqual([]);
    expect(success).toHaveBeenCalledWith({
      dryRun: true,
      request: {
        method: "POST",
        path: "/api/accounts/acc_soles/convert-type",
        body: { newType: "CREDIT", creditLimit: 5000, statementClosingDay: 20 },
      },
    });
  });

  it("posts the conversion and prints the compact account", async () => {
    apiRequest.mockImplementation(async (method: string, path: string) =>
      method === "GET" && path === "/api/accounts"
        ? { accounts: ACTIVE }
        : {
            account: { id: "acc_visa", name: "Visa Signature", type: "DEBIT" },
            fromType: "CREDIT",
            toType: "DEBIT",
            movedBalance: 0,
          },
    );

    await run("convertType", ["Visa Signature", "--type", "DEBIT"]);

    expect(writes()).toEqual([
      ["POST", "/api/accounts/acc_visa/convert-type", { newType: "DEBIT" }],
    ]);
    expect(success).toHaveBeenCalledWith(
      expect.objectContaining({
        fromType: "CREDIT",
        toType: "DEBIT",
        account: expect.objectContaining({ id: "acc_visa", type: "DEBIT" }),
      }),
    );
  });

  it.each([
    ["CREDIT without a limit", ["--type", "CREDIT"]],
    [
      "a limit on a non-CREDIT target",
      ["--type", "DEBIT", "--credit-limit", "1"],
    ],
    [
      "a closing day on a non-CREDIT target",
      ["--type", "CASH", "--statement-closing-day", "5"],
    ],
    [
      "a closing day out of range",
      [
        "--type",
        "CREDIT",
        "--credit-limit",
        "1",
        "--statement-closing-day",
        "32",
      ],
    ],
  ])("rejects %s", async (_name, args) => {
    await expect(run("convertType", ["Soles", ...args])).rejects.toMatchObject({
      code: "INVALID_VALUE",
    });
    expect(apiRequest).not.toHaveBeenCalled();
  });
});

describe("accounts permanent-delete", () => {
  it("refuses without --yes", async () => {
    await expect(run("permanentDelete", ["Soles"])).rejects.toMatchObject({
      code: "CONFIRMATION_REQUIRED",
      exitCode: 2,
      hint: "Re-run with --yes",
    });
    expect(apiRequest).not.toHaveBeenCalled();
  });

  it.each([
    ["an active account by exact name", "soles", "acc_soles", "Soles"],
    [
      "an archived account by exact name",
      "Old Wallet",
      "acc_old",
      "Old Wallet",
    ],
    ["an account by id", "acc_visa", "acc_visa", "Visa Signature"],
  ])("deletes %s", async (_name, ref, id, name) => {
    await run("permanentDelete", [ref, "--yes"]);

    expect(writes()).toEqual([["DELETE", `/api/accounts/${id}/permanent`]]);
    expect(success).toHaveBeenCalledWith({ deleted: { id, name } });
  });

  it("never deletes on a partial name", async () => {
    await expect(
      run("permanentDelete", ["Visa", "--yes"]),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(writes()).toEqual([]);
  });
});

describe("accounts empty-archive", () => {
  it("refuses without --yes", async () => {
    await expect(run("emptyArchive", [])).rejects.toMatchObject({
      code: "CONFIRMATION_REQUIRED",
    });
    expect(apiRequest).not.toHaveBeenCalled();
  });

  it("empties the archive with --yes", async () => {
    await run("emptyArchive", ["--yes"]);

    expect(apiRequest.mock.calls).toEqual([
      ["DELETE", "/api/accounts/archived"],
    ]);
    expect(success).toHaveBeenCalledWith({ success: true });
  });
});

describe("accounts list --include-archived paging", () => {
  const many = Array.from({ length: 60 }, (_, index) => ({
    id: `arch_${index}`,
    name: `Archived ${index}`,
    isArchived: true,
  }));

  function archivedMeta() {
    return success.mock.calls[0][1].archived;
  }

  it("pages archived accounts and reports hasMore", async () => {
    stubApi(many);

    await run("list", ["--include-archived", "--limit", "2", "--offset", "3"]);

    const [data, meta] = success.mock.calls[0];
    expect(data.map((row: { id: string }) => row.id)).toEqual([
      "acc_soles",
      "acc_visa",
      "acc_cash",
      "arch_3",
      "arch_4",
    ]);
    expect(meta.count).toBe(5);
    expect(meta.archived).toEqual({
      count: 2,
      limit: 2,
      offset: 3,
      hasMore: true,
    });
  });

  it("never asks the backend for more than 50 archived accounts", async () => {
    stubApi(many);

    await run("list", ["--include-archived"]);

    const limits = apiRequest.mock.calls
      .filter(([, path]) => path === "/api/accounts/archived")
      .map(([, , , params]) => Number(params.limit));
    expect(Math.max(...limits)).toBe(50);
    expect(archivedMeta()).toEqual({
      count: 50,
      limit: 50,
      offset: 0,
      hasMore: true,
    });
  });

  it("reports hasMore false on the last page", async () => {
    await run("list", ["--include-archived"]);

    expect(archivedMeta()).toEqual({
      count: 1,
      limit: 50,
      offset: 0,
      hasMore: false,
    });
  });

  it.each([
    ["--limit without --include-archived", ["--limit", "5"]],
    ["--limit above 50", ["--include-archived", "--limit", "51"]],
    ["a negative --offset", ["--include-archived", "--offset", "-1"]],
  ])("rejects %s", async (_name, args) => {
    await expect(run("list", args)).rejects.toMatchObject({
      code: "INVALID_VALUE",
    });
    expect(apiRequest).not.toHaveBeenCalled();
  });
});
