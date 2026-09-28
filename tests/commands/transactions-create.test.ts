import { beforeEach, describe, expect, it, vi } from "vitest";

const apiRequest = vi.fn();
const outputSuccess = vi.fn();
const outputError = vi.fn((message: string) => {
  throw new Error(message);
});

vi.mock("../../src/lib/api-client.js", () => ({
  apiRequest,
}));

vi.mock("../../src/lib/output.js", () => ({
  output: {
    success: outputSuccess,
    error: outputError,
  },
}));

vi.mock("../../src/lib/resolve.js", () => ({
  resolveAccount: async (ref: string) => ({ id: ref, name: ref }),
  resolveAccountId: async (ref?: string) => ref,
  resolveCategory: async (ref: string) => ({ id: ref, name: ref }),
  resolveCategoryId: async (ref?: string) => ref,
  resolveCategoryFilterIds: async (ref: string) => ref,
}));

vi.mock("../../src/lib/effects.js", () => ({
  accountsAfterWrite: async (ids: Array<string | undefined>) =>
    ids.filter(Boolean).map((id) => ({ id })),
}));

const { createTransactionCommand } =
  await import("../../src/commands/transactions/create.js");
const { updateTransactionCommand } =
  await import("../../src/commands/transactions/update.js");

describe("transactions create/update", () => {
  beforeEach(() => {
    apiRequest.mockReset();
    outputSuccess.mockReset();
    outputError.mockClear();
  });

  it("posts a parsed numeric amount and optional cashback", async () => {
    apiRequest.mockResolvedValue({ id: "tx_1" });

    await createTransactionCommand.parseAsync(
      [
        "--account-id",
        "acc_1",
        "--amount",
        "35.5",
        "--type",
        "EXPENSE",
        "--description",
        "Lunch",
        "--cashback-amount",
        "1.5",
      ],
      { from: "user" },
    );

    expect(apiRequest).toHaveBeenCalledWith("POST", "/api/transactions", {
      accountId: "acc_1",
      amount: 35.5,
      type: "EXPENSE",
      description: "Lunch",
      cashbackAmount: 1.5,
    });
  });

  it("rejects non-numeric amounts instead of sending null", async () => {
    await expect(
      createTransactionCommand.parseAsync(
        [
          "--account-id",
          "acc_1",
          "--amount",
          "abc",
          "--type",
          "EXPENSE",
          "--description",
          "Lunch",
        ],
        { from: "user" },
      ),
    ).rejects.toThrow("--amount must be a positive amount");

    expect(apiRequest).not.toHaveBeenCalled();
  });

  it("no longer exposes merchant flags (field removed from the backend)", () => {
    const createFlags = createTransactionCommand.options.map((o) => o.long);
    const updateFlags = updateTransactionCommand.options.map((o) => o.long);

    expect(createFlags).not.toContain("--merchant");
    expect(updateFlags).not.toContain("--merchant");
    expect(updateFlags).not.toContain("--clear-merchant");
  });

  it("returns the created view and the account balance after", async () => {
    apiRequest.mockResolvedValue({
      id: "tx_1",
      accountId: "acc_1",
      amount: "35.50",
      type: "EXPENSE",
      description: "Lunch",
      date: "2026-09-01T17:00:00.000Z",
      ocrRawResponse: { big: true },
    });

    await createTransactionCommand.parseAsync(
      [
        "--account",
        "acc_1",
        "--amount",
        "35.5",
        "--type",
        "expense",
        "--description",
        "Lunch",
      ],
      { from: "user" },
    );

    const [payload] = outputSuccess.mock.calls[0];
    expect(payload.transaction).toMatchObject({ id: "tx_1", amount: 35.5 });
    expect(payload.transaction).not.toHaveProperty("ocrRawResponse");
    expect(payload.account).toEqual({ id: "acc_1" });
  });

  it("builds the update body with a resolved category and parsed date", async () => {
    apiRequest.mockResolvedValue({ id: "tx_1", accountId: "acc_1" });

    await updateTransactionCommand.parseAsync(
      ["tx_1", "--category", "Food", "--date", "2026-09-02", "--clear-notes"],
      { from: "user" },
    );

    expect(apiRequest).toHaveBeenCalledWith("PUT", "/api/transactions/tx_1", {
      date: "2026-09-02",
      categoryId: "Food",
      notes: null,
    });
    expect(outputSuccess.mock.calls[0][0].account).toEqual({ id: "acc_1" });
  });
});
