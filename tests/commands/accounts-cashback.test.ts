import { beforeEach, describe, expect, it, vi } from "vitest";

const apiRequest = vi.fn();
const outputSuccess = vi.fn();

vi.mock("../../src/lib/api-client.js", () => ({ apiRequest }));
vi.mock("../../src/lib/output.js", () => ({
  output: { success: outputSuccess, error: vi.fn() },
}));
vi.mock("../../src/lib/resolve.js", () => ({
  resolveAccountId: async (ref?: string) => ref && `id_${ref}`,
}));
vi.mock("../../src/lib/effects.js", () => ({
  accountsAfterWrite: async (ids: string[]) => ids.map((id) => ({ id })),
}));

const { cashbackRedeemCommand, cashbackAdjustCommand } =
  await import("../../src/commands/accounts/cashback.js");

describe("accounts cashback commands", () => {
  beforeEach(() => {
    apiRequest.mockReset();
    outputSuccess.mockReset();
  });

  it("redeems cashback by account name and returns the balance after", async () => {
    apiRequest.mockResolvedValue({
      success: true,
      cashbackBalance: 10,
      account: { id: "id_Visa", imageBase64: "x" },
    });

    await cashbackRedeemCommand.parseAsync(["Visa", "--amount", "25.5"], {
      from: "user",
    });

    expect(apiRequest).toHaveBeenCalledWith(
      "POST",
      "/api/accounts/id_Visa/cashback/redeem",
      { amount: 25.5 },
    );
    expect(outputSuccess).toHaveBeenCalledWith({
      success: true,
      cashbackBalance: 10,
      account: { id: "id_Visa" },
    });
  });

  it.each(["abc", "", "-5", "1.234"])(
    "rejects redeem amount %j before any request",
    async (amount) => {
      await expect(
        cashbackRedeemCommand.parseAsync(["Visa", "--amount", amount], {
          from: "user",
        }),
      ).rejects.toMatchObject({ code: "INVALID_VALUE" });
      expect(apiRequest).not.toHaveBeenCalled();
    },
  );

  it("adjusts the cashback balance to a target value", async () => {
    apiRequest.mockResolvedValue({ success: true, cashbackBalance: 100 });

    await cashbackAdjustCommand.parseAsync(["Visa", "--balance", "100"], {
      from: "user",
    });

    expect(apiRequest).toHaveBeenCalledWith(
      "POST",
      "/api/accounts/id_Visa/cashback/adjust",
      { balance: 100 },
    );
  });

  it("rejects a negative target balance", async () => {
    await expect(
      cashbackAdjustCommand.parseAsync(["Visa", "--balance=-1"], {
        from: "user",
      }),
    ).rejects.toMatchObject({ code: "INVALID_VALUE" });
  });
});
