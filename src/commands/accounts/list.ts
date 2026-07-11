import { Command } from "commander";
import { apiRequest } from "../../lib/api-client.js";
import { output } from "../../lib/output.js";
import {
  extractItems,
  type Account,
  type AccountsSummary,
} from "../../lib/types.js";

export function withAvailableCredit<T extends AccountsSummary>(data: T): T {
  if (!data || !Array.isArray(data.accounts)) return data;
  const accounts = data.accounts.map((acc) => {
    if (acc.type === "CREDIT" && acc.creditLimit != null) {
      const limit = Number(acc.creditLimit);
      // currentDebt can be negative (credit balance in the user's favor),
      // which intentionally raises availableCredit above creditLimit.
      const debt = Number(acc.currentDebt ?? 0);
      const available = Math.max(0, Math.round((limit - debt) * 100) / 100);
      return { ...acc, availableCredit: available };
    }
    return acc;
  });
  return { ...data, accounts };
}

export function withArchivedAccounts<T extends AccountsSummary>(
  data: T,
  archivedAccounts: Account[],
): T & { archivedAccounts: Account[]; archivedAccountsCount: number } {
  return {
    ...data,
    accounts: [
      ...(Array.isArray(data.accounts) ? data.accounts : []),
      ...archivedAccounts,
    ],
    archivedAccounts,
    archivedAccountsCount: archivedAccounts.length,
  };
}

export function getArchivedAccountItems(response: unknown): Account[] {
  return extractItems<Account>(response, ["accounts", "items"]) ?? [];
}

export const listAccountsCommand = new Command("list")
  .description("List all accounts (CREDIT accounts include availableCredit)")
  .option("--include-archived", "Include archived accounts")
  .addHelpText(
    "after",
    `
Notes:
  - availableCredit = max(0, creditLimit - currentDebt). A negative
    currentDebt (overpaid card, balance in the user's favor) increases
    availableCredit above creditLimit; this is intentional.
`,
  )
  .action(async (opts) => {
    const data = await apiRequest<AccountsSummary>("GET", "/api/accounts");
    if (!opts.includeArchived) {
      output.success(withAvailableCredit(data));
      return;
    }

    const archivedAccounts = getArchivedAccountItems(
      await apiRequest<unknown>("GET", "/api/accounts/archived"),
    );
    output.success(
      withAvailableCredit(withArchivedAccounts(data, archivedAccounts)),
    );
  });
