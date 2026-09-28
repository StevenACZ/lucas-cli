import { beforeEach, describe, expect, it, vi } from "vitest";

const apiRequest = vi.fn();
const resolveAccount = vi.fn();

vi.mock("../../src/lib/api-client.js", () => ({ apiRequest }));
vi.mock("../../src/lib/output.js", () => ({
  output: { success: vi.fn(), error: vi.fn() },
}));
vi.mock("../../src/lib/resolve.js", () => ({ resolveAccount }));

const { buildDebtDetailParams, runDebtDetail } =
  await import("../../src/commands/accounts/debt-detail.js");

describe("accounts debt-detail", () => {
  beforeEach(() => {
    apiRequest.mockReset();
    resolveAccount.mockReset();
  });

  it("leaves the mode to the backend when not passed", () => {
    expect(buildDebtDetailParams({})).toEqual({ limit: "100", offset: "0" });
  });

  it("forwards all explicit flags", () => {
    expect(
      buildDebtDetailParams({
        mode: "custom",
        anchorDate: "2026-04-15",
        startDate: "2026-04-01",
        endDate: "2026-04-15",
        search: "uber",
        onlyPending: true,
        limit: "50",
        offset: "10",
      }),
    ).toEqual({
      mode: "custom",
      anchorDate: "2026-04-15",
      startDate: "2026-04-01",
      endDate: "2026-04-15",
      searchText: "uber",
      onlyPending: "true",
      limit: "50",
      offset: "10",
    });
  });

  it("calls the breakdown endpoint for the resolved card", async () => {
    resolveAccount.mockResolvedValue({
      id: "acc_1",
      name: "Visa",
      type: "CREDIT",
      statementClosingDay: 20,
    });
    apiRequest.mockResolvedValue({ summary: { currentDebt: 186.64 } });

    await runDebtDetail("Visa", { mode: "current_cycle" });

    expect(resolveAccount).toHaveBeenCalledWith("Visa");
    expect(apiRequest).toHaveBeenCalledWith(
      "GET",
      "/api/accounts/acc_1/credit-debt-breakdown",
      undefined,
      { mode: "current_cycle", limit: "100", offset: "0" },
    );
  });

  it("explains how to set a missing statement closing day", async () => {
    resolveAccount.mockResolvedValue({
      id: "acc_1",
      name: "Visa",
      type: "CREDIT",
      statementClosingDay: null,
    });

    await expect(
      runDebtDetail("Visa", { mode: "last_statement" }),
    ).rejects.toMatchObject({
      code: "INVALID_VALUE",
      exitCode: 2,
      hint: expect.stringContaining("--statement-closing-day"),
    });
    expect(apiRequest).not.toHaveBeenCalled();
  });
});
