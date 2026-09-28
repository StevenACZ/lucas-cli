import { beforeEach, describe, expect, it, vi } from "vitest";

const apiRequest = vi.fn();
const outputSuccess = vi.fn();

vi.mock("../../src/lib/api-client.js", () => ({ apiRequest }));
vi.mock("../../src/lib/output.js", () => ({
  output: { success: outputSuccess, error: vi.fn() },
}));

const { groupTransferLegs, listTransfersCommand } =
  await import("../../src/commands/transfers/list.js");

const accounts = {
  fromAccountId: "acc_pen",
  toAccountId: "acc_usd",
  fromAccount: { id: "acc_pen", name: "Soles", currency: "PEN", bank: "IBK" },
  toAccount: { id: "acc_usd", name: "Dólares", currency: "USD", bank: "IBK" },
};

function pair(id: string): Record<string, unknown>[] {
  return [
    {
      id: `${id}_in`,
      transferId: id,
      accountId: "acc_usd",
      amount: 100,
      date: "2026-09-01T17:00:00.000Z",
      ...accounts,
    },
    {
      id: `${id}_out`,
      transferId: id,
      accountId: "acc_pen",
      amount: 370,
      exchangeRate: 0.2703,
      description: "Cambio",
      date: "2026-09-01T17:00:00.000Z",
      ...accounts,
    },
  ];
}

describe("transfers list", () => {
  beforeEach(() => {
    apiRequest.mockReset();
    outputSuccess.mockReset();
  });

  it("groups both legs into one transfer view", () => {
    expect(groupTransferLegs(pair("tr_1"))).toEqual([
      expect.objectContaining({
        id: "tr_1",
        amount: 370,
        toAmount: 100,
        exchangeRate: 0.2703,
        description: "Cambio",
        from: { id: "acc_pen", name: "Soles", currency: "PEN" },
        to: { id: "acc_usd", name: "Dólares", currency: "USD" },
      }),
    ]);
  });

  it("falls back to leg direction and account when the transfer fields are absent", () => {
    const [view] = groupTransferLegs([
      {
        transferId: "tr_2",
        amount: "50.00",
        ocrRawResponse: { direction: "OUT" },
        account: { id: "a", name: "A", currency: "PEN" },
      },
      {
        transferId: "tr_2",
        amount: "50.00",
        ocrRawResponse: { direction: "IN" },
        account: { id: "b", name: "B", currency: "PEN" },
      },
    ]);

    expect(view).toMatchObject({
      amount: 50,
      toAmount: 50,
      from: { id: "a", name: "A" },
      to: { id: "b", name: "B" },
    });
  });

  it("returns an array with exact hasMore by asking one extra transfer", async () => {
    apiRequest.mockResolvedValue([...pair("tr_1"), ...pair("tr_2")]);

    await listTransfersCommand.parseAsync(["--limit", "1"], { from: "user" });

    expect(apiRequest).toHaveBeenCalledWith(
      "GET",
      "/api/transfers",
      undefined,
      {
        limit: "2",
        offset: "0",
      },
    );
    const [data, meta] = outputSuccess.mock.calls[0];
    expect(data).toHaveLength(1);
    expect(meta).toEqual({ count: 1, limit: 1, offset: 0, hasMore: true });
  });
});
