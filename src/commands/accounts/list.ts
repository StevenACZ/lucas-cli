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

export const listAccountsCommand = new Command("list")
  .description("List all accounts (CREDIT accounts include availableCredit)")
  .option("--include-archived", "Include archived accounts")
  .action(async (opts) => {
    const params: Record<string, string> = {};
    if (opts.includeArchived) params.includeArchived = "true";
    const data = await apiRequest<AccountsSummaryLike>(
      "GET",
      "/api/accounts",
      undefined,
      params,
    );
    output.success(withAvailableCredit(data));
  });
