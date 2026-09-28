import { beforeEach, describe, expect, it, vi } from "vitest";

const apiRequest = vi.fn();
const outputSuccess = vi.fn();

vi.mock("../../src/lib/api-client.js", () => ({
  apiRequest,
}));

vi.mock("../../src/lib/output.js", () => ({
  output: {
    success: outputSuccess,
    error: vi.fn(),
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

const { listTransactionsCommand } =
  await import("../../src/commands/transactions/list.js");
const { buildTransactionListParams } =
  await import("../../src/commands/transactions/list.js");

describe("transactions list command", () => {
  beforeEach(() => {
    apiRequest.mockReset();
    outputSuccess.mockReset();
  });

  it("maps legacy CLI flags to canonical transaction filter query params", async () => {
    apiRequest.mockResolvedValue([]);

    await listTransactionsCommand.parseAsync(
      [
        "--from",
        "2026-04-01",
        "--to",
        "2026-04-30",
        "--skip",
        "5",
        "--take",
        "10",
      ],
      { from: "user" },
    );

    expect(apiRequest).toHaveBeenCalledWith(
      "GET",
      "/api/transactions",
      undefined,
      {
        startDate: "2026-04-01",
        endDate: "2026-04-30",
        offset: "5",
        limit: "11",
      },
    );
    expect(outputSuccess).toHaveBeenCalledWith([], {
      count: 0,
      limit: 10,
      offset: 5,
      hasMore: false,
    });
  });

  it("maps backend-supported advanced filters", async () => {
    expect(
      await buildTransactionListParams({
        accountIds: "acc-1,acc-2",
        categoryIds: "cat-1,cat-2",
        search: "rappi",
        minAmount: "10",
        maxAmount: "100",
      }),
    ).toEqual({
      accountIds: "acc-1,acc-2",
      categoryIds: "cat-1,cat-2",
      searchText: "rappi",
      minAmount: "10",
      maxAmount: "100",
    });
  });
});
