import { describe, expect, it } from "vitest";
import { accountsListPayload } from "../../src/commands/accounts/list.js";

describe("accounts list", () => {
  const summary = {
    accounts: [
      {
        id: "a",
        name: "Visa",
        type: "CREDIT",
        creditLimit: "5000",
        currentDebt: 186.64,
      },
      {
        id: "b",
        name: "Soles",
        type: "DEBIT",
        balance: "500.5",
        imageBase64: "x",
      },
    ],
    balancesByCurrency: { PEN: 500.5 },
    debtByCurrency: { PEN: 186.64 },
  };

  it("returns an array of compact views with totals in meta", () => {
    const { data, meta } = accountsListPayload(summary, []);

    expect(data).toEqual([
      expect.objectContaining({ id: "a", availableCredit: 4813.36 }),
      expect.objectContaining({ id: "b", balance: 500.5 }),
    ]);
    expect(data[1]).not.toHaveProperty("imageBase64");
    expect(meta).toEqual({
      count: 2,
      balancesByCurrency: { PEN: 500.5 },
      debtByCurrency: { PEN: 186.64 },
    });
  });

  it("appends archived accounts without changing active totals", () => {
    const { data, meta } = accountsListPayload(summary, [
      { id: "z", name: "Old", type: "DEBIT", isArchived: true },
    ]);

    expect(data.map((row) => row.id)).toEqual(["a", "b", "z"]);
    expect(data[2]).toMatchObject({ archived: true });
    expect(meta.count).toBe(3);
    expect(meta.balancesByCurrency).toEqual({ PEN: 500.5 });
  });

  it("keeps raw rows with --full but still drops heavy blobs", () => {
    const { data } = accountsListPayload(summary, [], true);

    expect(data[1]).toMatchObject({ balance: "500.5" });
    expect(data[1]).not.toHaveProperty("imageBase64");
  });
});
