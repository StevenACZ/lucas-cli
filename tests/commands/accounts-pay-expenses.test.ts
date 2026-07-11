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
    expect(() => parseExpenseItem("tx_1=abc")).toThrow(/Invalid numeric value/);
  });

  it("posts an atomic batch body with repeated --item flags", async () => {
    const response = { success: true, totalPaid: 85 };
    apiRequest.mockResolvedValue(response);

    await payExpensesCommand.parseAsync(
      [
        "acc_123",
        "--source",
        "ACCOUNT",
        "--from-account-id",
        "acc_456",
        "--item",
        "tx_1",
        "--item",
        "tx_2=50",
      ],
      { from: "user" },
    );

    expect(apiRequest).toHaveBeenCalledWith(
      "POST",
      "/api/accounts/acc_123/pay-expenses",
      {
        source: "ACCOUNT",
        fromAccountId: "acc_456",
        items: [
          { transactionId: "tx_1" },
          { transactionId: "tx_2", amount: 50 },
        ],
      },
    );
    expect(outputSuccess).toHaveBeenCalledWith(response);
  });

  it("posts a single pay-expense body", async () => {
    apiRequest.mockResolvedValue({ success: true });

    await payExpenseCommand.parseAsync(
      [
        "acc_123",
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
      "/api/accounts/acc_123/pay-expense",
      {
        transactionId: "tx_1",
        source: "CASHBACK",
        amount: 25,
      },
    );
  });
});
