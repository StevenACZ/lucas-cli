import { beforeEach, describe, expect, it, vi } from "vitest";

const apiRequest = vi.fn();

vi.mock("../../src/lib/api-client.js", () => ({
  apiRequest,
}));

const { buildDebtDetailParams, runDebtDetail } =
  await import("../../src/commands/accounts/debt-detail.js");

describe("accounts debt-detail", () => {
  beforeEach(() => {
    apiRequest.mockReset();
  });

  it("buildDebtDetailParams applies AI-friendly defaults", () => {
    expect(buildDebtDetailParams({})).toEqual({
      mode: "current_cycle",
      limit: "100",
      offset: "0",
    });
  });

  it("buildDebtDetailParams forwards all explicit flags", () => {
    expect(
      buildDebtDetailParams({
        mode: "custom",
        anchorDate: "2026-04-19",
        startDate: "2026-04-01",
        endDate: "2026-04-15",
        search: "uber",
        onlyPending: true,
        limit: "50",
        offset: "10",
      }),
    ).toEqual({
      mode: "custom",
      anchorDate: "2026-04-19",
      startDate: "2026-04-01",
      endDate: "2026-04-15",
      searchText: "uber",
      onlyPending: "true",
      limit: "50",
      offset: "10",
    });
  });

  it("runDebtDetail calls the breakdown endpoint with id and params", async () => {
    apiRequest.mockResolvedValue({ summary: { currentDebt: 186.64 } });
    await runDebtDetail("acc_1", { mode: "current_cycle" });
    expect(apiRequest).toHaveBeenCalledWith(
      "GET",
      "/api/accounts/acc_1/credit-debt-breakdown",
      undefined,
      expect.objectContaining({
        mode: "current_cycle",
        limit: "100",
        offset: "0",
      }),
    );
  });
});
