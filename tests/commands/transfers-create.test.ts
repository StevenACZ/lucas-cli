import { beforeEach, describe, expect, it, vi } from "vitest";

const apiRequest = vi.fn();
const outputSuccess = vi.fn();

vi.mock("../../src/lib/api-client.js", () => ({ apiRequest }));
vi.mock("../../src/lib/output.js", () => ({
  output: { success: outputSuccess, error: vi.fn() },
}));
vi.mock("../../src/lib/resolve.js", () => ({
  resolveAccount: async (ref: string) => ({
    id: `acc_${ref.toLowerCase()}`,
    name: ref,
    currency: ref === "Dolares" ? "USD" : "PEN",
    bank: "IBK",
  }),
  resolveAccountId: async (ref?: string) => ref && `acc_${ref.toLowerCase()}`,
  resolveCategory: async (ref: string) => ({
    id: "cat_fees",
    name: ref,
    type: "EXPENSE",
  }),
}));
vi.mock("../../src/lib/effects.js", () => ({
  accountsAfterWrite: async (ids: Array<string | undefined>) =>
    [...new Set(ids.filter(Boolean))].map((id) => ({ id, balance: 1 })),
}));

const { createTransferCommand } =
  await import("../../src/commands/transfers/create.js");
const { updateTransferCommand } =
  await import("../../src/commands/transfers/update.js");

const base = ["--from-account", "Soles", "--to-account", "Dolares"];

describe("transfers create", () => {
  beforeEach(() => {
    apiRequest.mockReset();
    outputSuccess.mockReset();
  });

  it("prints the resolved request with the fee and writes nothing on --dry-run", async () => {
    await createTransferCommand.parseAsync(
      [
        ...base,
        "--amount",
        "370",
        "--to-amount",
        "100",
        "--description",
        "Cambio",
        "--fee",
        "2.5",
        "--fee-category",
        "Bank fees",
        "--dry-run",
      ],
      { from: "user" },
    );

    expect(apiRequest).not.toHaveBeenCalled();
    expect(outputSuccess).toHaveBeenCalledWith({
      dryRun: true,
      request: {
        method: "POST",
        path: "/api/transfers",
        body: {
          fromAccountId: "acc_soles",
          toAccountId: "acc_dolares",
          amount: 370,
          toAmount: 100,
          description: "Cambio",
          fee: {
            amount: 2.5,
            description: "Comisión: Cambio",
            categoryId: "cat_fees",
          },
        },
      },
      from: { id: "acc_soles", name: "Soles", currency: "PEN" },
      to: { id: "acc_dolares", name: "Dolares", currency: "USD" },
      feeCategory: expect.objectContaining({ id: "cat_fees" }),
    });
  });

  it("returns the transfer view, the fee view and both balances after", async () => {
    apiRequest.mockResolvedValue({
      transferId: "tr_1",
      transfer: {
        id: "tr_1",
        amount: "370",
        toAmount: "100",
        exchangeRate: "0.2703",
        date: "2026-09-01T17:00:00.000Z",
        description: null,
        notes: null,
        fromAccountId: "acc_soles",
        toAccountId: "acc_dolares",
      },
      fromTransaction: { id: "l1", amount: "370", accountId: "acc_soles" },
      toTransaction: { id: "l2", amount: "100", accountId: "acc_dolares" },
      feeTransaction: {
        id: "tx_fee",
        type: "EXPENSE",
        amount: "2.5",
        description: "Comisión de transferencia",
        accountId: "acc_soles",
      },
    });

    await createTransferCommand.parseAsync(
      [...base, "--amount", "370", "--fee", "2.5"],
      { from: "user" },
    );

    expect(apiRequest.mock.calls[0][2]).toMatchObject({
      fee: { amount: 2.5, description: "Comisión de transferencia" },
    });
    const [payload] = outputSuccess.mock.calls[0];
    expect(payload.transfer).toMatchObject({
      id: "tr_1",
      amount: 370,
      toAmount: 100,
      exchangeRate: 0.2703,
      from: { id: "acc_soles", name: "Soles", currency: "PEN" },
      to: { id: "acc_dolares", name: "Dolares", currency: "USD" },
    });
    expect(payload.fee).toMatchObject({ id: "tx_fee", amount: 2.5 });
    expect(payload.accounts).toEqual([
      { id: "acc_soles", balance: 1 },
      { id: "acc_dolares", balance: 1 },
    ]);
  });

  it("keeps the hidden legacy flags working", async () => {
    apiRequest.mockResolvedValue({ transfer: { id: "tr_1" } });

    await createTransferCommand.parseAsync(
      [
        "--from-account-id",
        "A",
        "--to-account-id",
        "B",
        "--amount",
        "10",
        "--exchange-rate",
        "3.7",
      ],
      { from: "user" },
    );

    expect(apiRequest.mock.calls[0][2]).toEqual({
      fromAccountId: "acc_a",
      toAccountId: "acc_b",
      amount: 10,
      exchangeRate: 3.7,
    });
    expect(outputSuccess.mock.calls[0][0].fee).toBeNull();
  });

  it.each([
    [["--amount", "0"], "--amount"],
    [["--amount", "10", "--fee", "-1"], "--fee"],
    [["--amount", "10", "--fee-category", "Fees"], "--fee"],
    [["--amount", "10", "--rate", "0"], "--rate"],
  ])("rejects %j locally", async (flags, mention) => {
    await expect(
      createTransferCommand.parseAsync([...base, ...flags], { from: "user" }),
    ).rejects.toMatchObject({
      code: "INVALID_VALUE",
      message: expect.stringContaining(mention),
    });
    expect(apiRequest).not.toHaveBeenCalled();
  });

  it("rejects the same account on both sides", async () => {
    await expect(
      createTransferCommand.parseAsync(
        ["--from-account", "Soles", "--to-account", "Soles", "--amount", "1"],
        { from: "user" },
      ),
    ).rejects.toMatchObject({ code: "INVALID_VALUE" });
  });
});

describe("transfers update", () => {
  beforeEach(() => {
    apiRequest.mockReset();
    outputSuccess.mockReset();
  });

  it("resends the current amount for a notes-only edit", async () => {
    apiRequest.mockImplementation(async (method: string) => {
      if (method === "GET") {
        return [
          {
            transferId: "tr_1",
            accountId: "a",
            amount: "370.00",
            ocrRawResponse: { direction: "OUT" },
          },
          {
            transferId: "tr_1",
            accountId: "b",
            amount: "100.00",
            ocrRawResponse: { direction: "IN" },
          },
        ];
      }
      return {
        fromTransaction: { amount: "370", accountId: "a" },
        toTransaction: { amount: "100", accountId: "b" },
        fromAccount: { id: "a", name: "Soles", currency: "PEN" },
        toAccount: { id: "b", name: "Dolares", currency: "USD" },
        affectedAccounts: [{ id: "a" }, { id: "b" }],
      };
    });

    await updateTransferCommand.parseAsync(["tr_1", "--notes", "Rent"], {
      from: "user",
    });

    expect(apiRequest).toHaveBeenCalledWith("PUT", "/api/transfers/tr_1", {
      amount: 370,
      notes: "Rent",
    });
    const [payload] = outputSuccess.mock.calls[0];
    expect(payload.transfer).toMatchObject({ id: "tr_1", amount: 370 });
    expect(payload.accounts).toEqual([
      { id: "a", balance: 1 },
      { id: "b", balance: 1 },
    ]);
  });
});
