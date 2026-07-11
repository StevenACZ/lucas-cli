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
    ).rejects.toThrow("Invalid numeric value for --amount");

    expect(apiRequest).not.toHaveBeenCalled();
  });

  it("no longer exposes merchant flags (field removed from the backend)", () => {
    const createFlags = createTransactionCommand.options.map((o) => o.long);
    const updateFlags = updateTransactionCommand.options.map((o) => o.long);

    expect(createFlags).not.toContain("--merchant");
    expect(updateFlags).not.toContain("--merchant");
    expect(updateFlags).not.toContain("--clear-merchant");
  });
});
