import { Command } from "commander";
import { apiRequest } from "../../lib/api-client.js";
import { output } from "../../lib/output.js";

interface TransactionListOptions {
  from?: string;
  to?: string;
  categoryId?: string;
  categoryIds?: string;
  accountId?: string;
  accountIds?: string;
  type?: string;
  search?: string;
  minAmount?: string;
  maxAmount?: string;
  skip?: string;
  take?: string;
  offset?: string;
  limit?: string;
}

export function buildTransactionListParams(
  opts: TransactionListOptions,
): Record<string, string> {
  const params: Record<string, string> = {};
  if (opts.from) params.startDate = opts.from;
  if (opts.to) params.endDate = opts.to;
  if (opts.categoryId) params.categoryId = opts.categoryId;
  if (opts.categoryIds) params.categoryIds = opts.categoryIds;
  if (opts.accountId) params.accountId = opts.accountId;
  if (opts.accountIds) params.accountIds = opts.accountIds;
  if (opts.type) params.type = opts.type;
  if (opts.search) params.searchText = opts.search;
  if (opts.minAmount) params.minAmount = opts.minAmount;
  if (opts.maxAmount) params.maxAmount = opts.maxAmount;
  if (opts.offset ?? opts.skip) params.offset = opts.offset ?? opts.skip!;
  if (opts.limit ?? opts.take) params.limit = opts.limit ?? opts.take!;
  return params;
}

export const listTransactionsCommand = new Command("list")
  .description("List transactions")
  .option("--from <date>", "Start date (YYYY-MM-DD)")
  .option("--to <date>", "End date (YYYY-MM-DD)")
  .option("--category-id <id>", "Filter by category")
  .option("--category-ids <ids>", "Comma-separated category IDs")
  .option("--account-id <id>", "Filter by account")
  .option("--account-ids <ids>", "Comma-separated account IDs")
  .option("--type <type>", "Filter by type (INCOME|EXPENSE)")
  .option("--search <text>", "Search description, merchant, or notes")
  .option("--min-amount <amount>", "Minimum amount")
  .option("--max-amount <amount>", "Maximum amount")
  .option("--skip <n>", "Skip N records (alias for --offset)")
  .option("--take <n>", "Take N records (alias for --limit)")
  .option("--offset <n>", "Pagination offset")
  .option("--limit <n>", "Items per page (1..100)")
  .action(async (opts: TransactionListOptions) => {
    const params = buildTransactionListParams(opts);

    const data = await apiRequest(
      "GET",
      "/api/transactions",
      undefined,
      params,
    );
    output.success(data);
  });
