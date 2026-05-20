import { Command } from "commander";
import { apiRequest } from "../../lib/api-client.js";
import { output } from "../../lib/output.js";

interface AccountLike {
  type?: string;
  creditLimit?: number | null;
  currentDebt?: number | null;
  [key: string]: unknown;
}

interface AccountsSummaryLike {
  accounts?: AccountLike[];
  [key: string]: unknown;
}

export function withAvailableCredit<T extends AccountsSummaryLike>(data: T): T {
  if (!data || !Array.isArray(data.accounts)) return data;
  const accounts = data.accounts.map((acc) => {
    if (acc.type === "CREDIT" && acc.creditLimit != null) {
      const limit = Number(acc.creditLimit);
      const debt = Number(acc.currentDebt ?? 0);
      const available = Math.max(0, Math.round((limit - debt) * 100) / 100);
      return { ...acc, availableCredit: available };
    }
    return acc;
  });
  return { ...data, accounts };
}

export function withArchivedAccounts<T extends AccountsSummaryLike>(
  data: T,
  archivedAccounts: AccountLike[],
): T & { archivedAccounts: AccountLike[]; archivedAccountsCount: number } {
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

export function getArchivedAccountItems(response: unknown): AccountLike[] {
  if (Array.isArray(response)) return response as AccountLike[];
  if (
    response &&
    typeof response === "object" &&
    Array.isArray((response as { accounts?: unknown }).accounts)
  ) {
    return (response as { accounts: AccountLike[] }).accounts;
  }
  if (
    response &&
    typeof response === "object" &&
    Array.isArray((response as { items?: unknown }).items)
  ) {
    return (response as { items: AccountLike[] }).items;
  }
  return [];
}

export const listAccountsCommand = new Command("list")
  .description("List all accounts (CREDIT accounts include availableCredit)")
  .option("--include-archived", "Include archived accounts")
  .action(async (opts) => {
    const data = await apiRequest<AccountsSummaryLike>("GET", "/api/accounts");
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
