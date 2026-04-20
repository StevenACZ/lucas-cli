import { Command } from "commander";
import { apiRequest } from "../../lib/api-client.js";
import { output } from "../../lib/output.js";

export interface DebtDetailOptions {
  mode?: string;
  anchorDate?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  onlyPending?: boolean;
  limit?: string;
  offset?: string;
}

export function buildDebtDetailParams(
  opts: DebtDetailOptions,
): Record<string, string> {
  const params: Record<string, string> = {
    mode: opts.mode ?? "current_cycle",
    limit: opts.limit ?? "100",
    offset: opts.offset ?? "0",
  };
  if (opts.anchorDate) params.anchorDate = opts.anchorDate;
  if (opts.startDate) params.startDate = opts.startDate;
  if (opts.endDate) params.endDate = opts.endDate;
  if (opts.search) params.searchText = opts.search;
  if (opts.onlyPending) params.onlyPending = "true";
  return params;
}

export async function runDebtDetail(id: string, opts: DebtDetailOptions) {
  const params = buildDebtDetailParams(opts);
  const data = await apiRequest(
    "GET",
    `/api/accounts/${id}/credit-debt-breakdown`,
    undefined,
    params,
  );
  output.success(data);
}

export const debtDetailCommand = new Command("debt-detail")
  .description(
    "Get credit card debt breakdown for a billing cycle (AI-friendly pass-through of /api/accounts/:id/credit-debt-breakdown)",
  )
  .argument("<id>", "Credit account ID")
  .option(
    "--mode <mode>",
    "Cycle mode: current_cycle | last_statement | custom",
    "current_cycle",
  )
  .option("--anchor-date <date>", "Anchor date (YYYY-MM-DD), defaults to today")
  .option("--start-date <date>", "Custom mode start date (YYYY-MM-DD)")
  .option("--end-date <date>", "Custom mode end date (YYYY-MM-DD)")
  .option("--search <text>", "Filter by description/merchant/notes")
  .option("--only-pending", "Only unpaid items")
  .option("--limit <n>", "Items per page (1..100)", "100")
  .option("--offset <n>", "Pagination offset", "0")
  .addHelpText(
    "after",
    `
Notes:
  - Payments are returned as separate rows; individual charges are NOT
    marked partially paid (the model does not allocate payments to specific charges).
  - Modes current_cycle and last_statement require the account to have
    a statementClosingDay set. Without one, use --mode custom.
  - Archived accounts: behavior is the same as the underlying endpoint
    (no extra filtering added by the CLI).

Examples:
  lucas accounts debt-detail acc_123
  lucas accounts debt-detail acc_123 --mode last_statement
  lucas accounts debt-detail acc_123 --mode custom --start-date 2026-04-01 --end-date 2026-04-15
  lucas accounts debt-detail acc_123 --only-pending --search uber
`,
  )
  .action(runDebtDetail);
