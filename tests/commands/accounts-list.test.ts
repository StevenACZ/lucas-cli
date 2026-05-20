import { describe, expect, it } from "vitest";
import {
  getArchivedAccountItems,
  withArchivedAccounts,
  withAvailableCredit,
} from "../../src/commands/accounts/list.js";

describe("accounts list availableCredit", () => {
  it("adds availableCredit for CREDIT accounts with non-null creditLimit", () => {
    const input = {
      accounts: [
        { id: "a", type: "CREDIT", creditLimit: 5000, currentDebt: 186.64 },
        { id: "b", type: "CREDIT", creditLimit: 1000, currentDebt: 1200 },
        { id: "c", type: "CREDIT", creditLimit: null, currentDebt: 0 },
        { id: "d", type: "DEBIT", balance: 500 },
      ],
      totalBalance: 0,
    };
    const result = withAvailableCredit(input as never) as {
      accounts: Array<Record<string, unknown>>;
    };
    expect(result.accounts[0]).toMatchObject({ availableCredit: 4813.36 });
    expect(result.accounts[1]).toMatchObject({ availableCredit: 0 });
    expect(result.accounts[2]).not.toHaveProperty("availableCredit");
    expect(result.accounts[3]).not.toHaveProperty("availableCredit");
  });

  it("passes through input when accounts array is missing", () => {
    const input = { totalBalance: 0 };
    expect(withAvailableCredit(input as never)).toBe(input);
  });

  it("appends archived accounts without changing active totals", () => {
    const result = withArchivedAccounts(
      {
        accounts: [{ id: "active", isArchived: false }],
        totalBalance: 100,
      },
      [{ id: "archived", isArchived: true }],
    );

    expect(result.accounts.map((account) => account.id)).toEqual([
      "active",
      "archived",
    ]);
    expect(result.archivedAccountsCount).toBe(1);
    expect(result.totalBalance).toBe(100);
  });

  it("normalizes archived account responses from array or wrapper shapes", () => {
    const archived = [{ id: "archived", isArchived: true }];

    expect(getArchivedAccountItems(archived)).toEqual(archived);
    expect(getArchivedAccountItems({ accounts: archived })).toEqual(archived);
    expect(getArchivedAccountItems({ items: archived })).toEqual(archived);
    expect(getArchivedAccountItems({})).toEqual([]);
  });
});
