import { Command } from "commander";
import { apiRequest } from "../../lib/api-client.js";
import { output } from "../../lib/output.js";
import { extractItems, type AccountsSummary } from "../../lib/types.js";
import { accountView, stripHeavy } from "../../lib/views.js";

type Row = Record<string, unknown>;

export function accountsListPayload(
  summary: AccountsSummary,
  archived: Row[],
  full = false,
): { data: Row[]; meta: Row } {
  const rows = [
    ...(extractItems<Row>(summary, ["accounts", "items"]) ?? []),
    ...archived,
  ];
  return {
    data: rows.map((row) => (full ? stripHeavy(row) : accountView(row))),
    meta: {
      count: rows.length,
      balancesByCurrency: summary.balancesByCurrency ?? {},
      debtByCurrency: summary.debtByCurrency ?? {},
    },
  };
}

export const listAccountsCommand = new Command("list")
  .description("List accounts with balances (CREDIT rows add availableCredit)")
  .option("--include-archived", "Append archived accounts")
  .option("--full", "Print the raw backend objects")
  .addHelpText(
    "after",
    `
Output: data is an array of accounts; meta has count, balancesByCurrency and
debtByCurrency (active accounts only). availableCredit = max(0, creditLimit -
currentDebt); an overpaid card (negative currentDebt) raises it above the limit.

Examples:
  lucas accounts list
  lucas accounts list --include-archived
`,
  )
  .action(async (opts: { includeArchived?: boolean; full?: boolean }) => {
    const summary = await apiRequest<AccountsSummary>("GET", "/api/accounts");
    const archived = opts.includeArchived
      ? (extractItems<Row>(
          await apiRequest<unknown>("GET", "/api/accounts/archived"),
          ["accounts", "items"],
        ) ?? [])
      : [];
    const { data, meta } = accountsListPayload(summary, archived, opts.full);
    output.success(data, meta);
  });
