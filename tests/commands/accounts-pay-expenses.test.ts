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
  resolveAccountId: async (ref?: string) => ref && `id_${ref}`,
}));

vi.mock("../../src/lib/effects.js", () => ({
  accountsAfterWrite: async (ids: Array<string | undefined>) =>
    ids.filter(Boolean).map((id) => ({ id })),
}));

const { parseExpenseItem, payExpensesCommand } =
  await import("../../src/commands/accounts/pay-expenses.js");
const { payExpenseCommand } =
  await import("../../src/commands/accounts/pay-expense.js");

describe("accounts pay-expenses batch", () => {
  beforeEach(() => {
    apiRequest.mockReset();
    outputSuccess.mockReset();
    outputError.mockClear();
  });

  it("parses --item specs with and without an explicit amount", () => {
    expect(parseExpenseItem("tx_1")).toEqual({ transactionId: "tx_1" });
    expect(parseExpenseItem("tx_2=50.25")).toEqual({
      transactionId: "tx_2",
      amount: 50.25,
    });
  });

  it("rejects malformed --item specs", () => {
    expect(() => parseExpenseItem("=10")).toThrow(/Invalid --item value/);
    expect(() => parseExpenseItem("tx_1=10=20")).toThrow(
      /Invalid --item value/,
    );
    expect(() => parseExpenseItem("tx_1=abc")).toThrow(/positive amount/);
  });

  it("posts an atomic batch body with repeated --item flags", async () => {
    const response = { success: true, totalPaid: 85 };
    apiRequest.mockResolvedValue(response);

    await payExpensesCommand.parseAsync(
      [
        "Visa",
        "--source",
        "account",
        "--from-account",
        "Soles",
        "--item",
        "tx_1",
        "--item",
        "tx_2=50",
      ],
      { from: "user" },
    );

    expect(apiRequest).toHaveBeenCalledWith(
      "POST",
      "/api/accounts/id_Visa/pay-expenses",
      {
        source: "ACCOUNT",
        fromAccountId: "id_Soles",
        items: [
          { transactionId: "tx_1" },
          { transactionId: "tx_2", amount: 50 },
        ],
      },
    );
    expect(outputSuccess).toHaveBeenCalledWith({
      ...response,
      accounts: [{ id: "id_Visa" }, { id: "id_Soles" }],
    });
  });

  it("posts a single pay-expense body", async () => {
    apiRequest.mockResolvedValue({ success: true });

    await payExpenseCommand.parseAsync(
      [
        "Visa",
        "--transaction-id",
        "tx_1",
        "--source",
        "CASHBACK",
        "--amount",
        "25",
      ],
      { from: "user" },
    );

    expect(apiRequest).toHaveBeenCalledWith(
      "POST",
      "/api/accounts/id_Visa/pay-expense",
      {
        transactionId: "tx_1",
        source: "CASHBACK",
        amount: 25,
      },
    );
  });

  it("requires a funding account for --source ACCOUNT", async () => {
    await expect(
      payExpenseCommand.parseAsync(
        ["Visa", "--transaction-id", "tx_1", "--source", "ACCOUNT"],
        { from: "user" },
      ),
    ).rejects.toMatchObject({ code: "INVALID_VALUE" });
    expect(apiRequest).not.toHaveBeenCalled();
  });

  it("prints the request and writes nothing with --dry-run", async () => {
    await payExpenseCommand.parseAsync(
      [
        "Visa",
        "--transaction-id",
        "tx_1",
        "--source",
        "ACCOUNT",
        "--from-account-id",
        "acc_456",
        "--dry-run",
      ],
      { from: "user" },
    );

    expect(apiRequest).not.toHaveBeenCalled();
    expect(outputSuccess).toHaveBeenCalledWith({
      dryRun: true,
      request: {
        method: "POST",
        path: "/api/accounts/id_Visa/pay-expense",
        body: {
          transactionId: "tx_1",
          source: "ACCOUNT",
          fromAccountId: "id_acc_456",
        },
      },
    });
  });
});
