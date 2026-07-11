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

const { cashbackRedeemCommand, cashbackAdjustCommand } =
  await import("../../src/commands/accounts/cashback.js");

describe("accounts cashback commands", () => {
  beforeEach(() => {
    apiRequest.mockReset();
    outputSuccess.mockReset();
    outputError.mockClear();
  });

  it("redeems cashback with a numeric amount", async () => {
    const response = { success: true, cashbackBalance: 10 };
    apiRequest.mockResolvedValue(response);

    await cashbackRedeemCommand.parseAsync(["acc_123", "--amount", "25.5"], {
      from: "user",
    });

    expect(apiRequest).toHaveBeenCalledWith(
      "POST",
      "/api/accounts/acc_123/cashback/redeem",
      { amount: 25.5 },
    );
    expect(outputSuccess).toHaveBeenCalledWith(response);
  });

  it("rejects non-numeric redeem amounts", async () => {
    await expect(
      cashbackRedeemCommand.parseAsync(["acc_123", "--amount", "abc"], {
        from: "user",
      }),
    ).rejects.toThrow("Invalid numeric value for --amount");

    expect(apiRequest).not.toHaveBeenCalled();
  });

  it("adjusts the cashback balance to a target value", async () => {
    apiRequest.mockResolvedValue({ success: true, cashbackBalance: 100 });

    await cashbackAdjustCommand.parseAsync(["acc_123", "--balance", "100"], {
      from: "user",
    });

    expect(apiRequest).toHaveBeenCalledWith(
      "POST",
      "/api/accounts/acc_123/cashback/adjust",
      { balance: 100 },
    );
  });
});
