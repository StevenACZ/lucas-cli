import { Command } from "commander";
import { apiRequest } from "../../lib/api-client.js";
import { choice } from "../../lib/choices.js";
import { parseDateOption } from "../../lib/dates.js";
import { CliError } from "../../lib/errors.js";
import { output } from "../../lib/output.js";
import { parseLimit, parseOffset } from "../../lib/paging.js";
import { resolveAccount } from "../../lib/resolve.js";
import { resourcePath } from "../../lib/resource-path.js";
import { stripHeavy } from "../../lib/views.js";

const MODES = ["current_cycle", "last_statement", "custom"];

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
    limit: String(parseLimit(opts.limit, 100)),
    offset: String(parseOffset(opts.offset)),
  };
  if (opts.mode) params.mode = opts.mode;
  const anchorDate = parseDateOption(opts.anchorDate, "--anchor-date");
  const startDate = parseDateOption(opts.startDate, "--start-date");
  const endDate = parseDateOption(opts.endDate, "--end-date");
  if (anchorDate) params.anchorDate = anchorDate;
  if (startDate) params.startDate = startDate;
  if (endDate) params.endDate = endDate;
  if (opts.search) params.searchText = opts.search;
  if (opts.onlyPending) params.onlyPending = "true";
  return params;
}

export async function runDebtDetail(ref: string, opts: DebtDetailOptions) {
  const params = buildDebtDetailParams(opts);
  const account = await resolveAccount(ref);
  const needsClosingDay =
    params.mode === "current_cycle" || params.mode === "last_statement";
  if (
    needsClosingDay &&
    account.type === "CREDIT" &&
    (account.statementClosingDay === null ||
      account.statementClosingDay === undefined)
  ) {
    throw new CliError({
      code: "INVALID_VALUE",
      message: `--mode ${params.mode} needs a statement closing day and "${account.name}" has none`,
      hint: `Run: lucas accounts update "${account.name}" --statement-closing-day <1..31>, or use --mode custom`,
    });
  }
  const data = await apiRequest(
    "GET",
    resourcePath("/api/accounts", String(account.id), "credit-debt-breakdown"),
    undefined,
    params,
  );
  output.success(stripHeavy(data));
}

export const debtDetailCommand = new Command("debt-detail")
  .description("Get credit card debt breakdown for a billing cycle")
  .argument("<account>", "Credit account name or id")
  .option(
    "--mode <mode>",
    "current_cycle, last_statement or custom (default: current_cycle when the card has a closing day, else custom)",
    choice(MODES),
  )
  .option(
    "--anchor-date <date>",
    "today, yesterday or YYYY-MM-DD (default: today)",
  )
  .option("--start-date <date>", "Custom mode start day (YYYY-MM-DD)")
  .option("--end-date <date>", "Custom mode end day (YYYY-MM-DD)")
  .option("--search <text>", "Filter by description or notes")
  .option("--only-pending", "Only unpaid items")
  .option("--limit <n>", "Items per page, 1..100 (default 100)")
  .option("--offset <n>", "Items to skip (default 0)")
  .addHelpText(
    "after",
    `
Notes:
  - Payments are returned as separate rows; individual charges are NOT
    marked partially paid (the model does not allocate payments to specific charges).
  - Modes current_cycle and last_statement need a statement closing day:
    lucas accounts update <card> --statement-closing-day <1..31>.
  - Archived accounts are handled the same way as the LucasApp account view.

Examples:
  lucas accounts debt-detail "Visa Signature"
  lucas accounts debt-detail "Visa Signature" --mode last_statement
  lucas accounts debt-detail "Visa Signature" --mode custom --start-date 2026-04-01 --end-date 2026-04-15
  lucas accounts debt-detail "Visa Signature" --only-pending --search uber
`,
  )
  .action(runDebtDetail);
