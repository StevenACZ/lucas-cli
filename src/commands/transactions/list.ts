import { Command, InvalidArgumentError, Option } from "commander";
import { parseDateOption } from "../../lib/dates.js";
import { invalidValue } from "../../lib/errors.js";
import { parseFiniteNumber } from "../../lib/number-parser.js";
import { output } from "../../lib/output.js";
import {
  fetchAll,
  fetchPage,
  parseLimit,
  parseOffset,
} from "../../lib/paging.js";
import { compactParams } from "../../lib/query-params.js";
import {
  resolveAccountId,
  resolveCategoryFilterIds,
} from "../../lib/resolve.js";
import { stripHeavy, transactionView } from "../../lib/views.js";

const DEFAULT_LIMIT = 50;
const DEFAULT_MAX = 2000;

function collect(value: string, previous: string[] = []): string[] {
  return [...previous, value];
}

function parseListType(value: string): string {
  const type = value.trim().toUpperCase();
  if (!["INCOME", "EXPENSE", "TRANSFER"].includes(type)) {
    throw new InvalidArgumentError("Use INCOME, EXPENSE or TRANSFER.");
  }
  return type;
}

interface TransactionListOptions {
  account?: string[];
  accountId?: string;
  accountIds?: string;
  category?: string[];
  categoryId?: string;
  categoryIds?: string;
  type?: string;
  from?: string;
  to?: string;
  search?: string;
  minAmount?: string;
  maxAmount?: string;
  limit?: string;
  take?: string;
  offset?: string;
  skip?: string;
  all?: boolean;
  max?: string;
  full?: boolean;
}

async function idsOf(
  refs: string[] | undefined,
  legacy: string | undefined,
  resolve: (ref: string) => Promise<string | undefined>,
): Promise<string | undefined> {
  const values = [
    ...(refs ?? []),
    ...(legacy ? legacy.split(",").map((id) => id.trim()) : []),
  ].filter(Boolean);
  if (values.length === 0) return undefined;
  const ids = await Promise.all(values.map(resolve));
  return ids.join(",");
}

export async function buildTransactionListParams(
  opts: TransactionListOptions,
): Promise<Record<string, string>> {
  const accountIds = await idsOf(
    opts.account,
    opts.accountIds ?? opts.accountId,
    resolveAccountId,
  );
  const categoryIds = await idsOf(
    opts.category,
    opts.categoryIds ?? opts.categoryId,
    (ref) => resolveCategoryFilterIds(ref, opts.type),
  );
  const amount = (value: string | undefined, flag: string) =>
    value === undefined ? undefined : String(parseFiniteNumber(value, flag));
  return (
    compactParams({
      accountIds,
      categoryIds,
      type: opts.type,
      startDate: parseDateOption(opts.from, "--from"),
      endDate: parseDateOption(opts.to, "--to"),
      searchText: opts.search,
      minAmount: amount(opts.minAmount, "--min-amount"),
      maxAmount: amount(opts.maxAmount, "--max-amount"),
    }) ?? {}
  );
}

export const listTransactionsCommand = new Command("list")
  .description("List movements, newest first")
  .option("--account <name|id>", "Filter by account (repeatable)", collect)
  .option("--category <name|id>", "Filter by category (repeatable)", collect)
  .option("--type <type>", "INCOME, EXPENSE or TRANSFER", parseListType)
  .option("--from <date>", "Start day (today, yesterday or YYYY-MM-DD)")
  .option("--to <date>", "End day, inclusive (today, yesterday or YYYY-MM-DD)")
  .option("--search <text>", "Search description or notes")
  .option("--min-amount <amount>", "Minimum amount")
  .option("--max-amount <amount>", "Maximum amount")
  .option("--limit <n>", `Rows per page, 1..100 (default ${DEFAULT_LIMIT})`)
  .option("--offset <n>", "Rows to skip")
  .option("--all", "Fetch every page (up to --max rows)")
  .option("--max <n>", `Row cap for --all (default ${DEFAULT_MAX})`)
  .option("--full", "Print the raw backend objects")
  .addOption(new Option("--account-id <id>").hideHelp())
  .addOption(new Option("--account-ids <ids>").hideHelp())
  .addOption(new Option("--category-id <id>").hideHelp())
  .addOption(new Option("--category-ids <ids>").hideHelp())
  .addOption(new Option("--take <n>").hideHelp())
  .addOption(new Option("--skip <n>").hideHelp())
  .addHelpText(
    "after",
    `
Output: data is always an array; meta carries count and hasMore (or truncated
with --all). Each row has localDate in the machine timezone (LUCAS_TZ overrides).

Examples:
  lucas transactions list --account "ITK Dólares" --from 2026-09-01 --to today
  lucas transactions list --search Hapi --all
`,
  )
  .action(async (opts: TransactionListOptions) => {
    const params = await buildTransactionListParams(opts);
    const view = (row: Record<string, unknown>) =>
      opts.full ? stripHeavy(row) : transactionView(row);

    if (opts.all) {
      const max = opts.max === undefined ? DEFAULT_MAX : Number(opts.max);
      if (!Number.isInteger(max) || max < 1) {
        throw invalidValue("--max must be a positive integer", {
          value: opts.max,
        });
      }
      const { rows, truncated } = await fetchAll(
        "/api/transactions",
        params,
        max,
      );
      output.success(rows.map(view), { count: rows.length, truncated });
      return;
    }

    const limit = parseLimit(opts.limit ?? opts.take, DEFAULT_LIMIT);
    const offset = parseOffset(opts.offset ?? opts.skip);
    const { rows, hasMore } = await fetchPage(
      "/api/transactions",
      params,
      limit,
      offset,
    );
    output.success(rows.map(view), {
      count: rows.length,
      limit,
      offset,
      hasMore,
    });
  });
