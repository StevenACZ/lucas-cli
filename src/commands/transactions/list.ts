import { Command } from "commander";
import { apiRequest } from "../../lib/api-client.js";
import { compactParams } from "../../lib/query-params.js";
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
  return (
    compactParams({
      startDate: opts.from,
      endDate: opts.to,
      categoryId: opts.categoryId,
      categoryIds: opts.categoryIds,
      accountId: opts.accountId,
      accountIds: opts.accountIds,
      type: opts.type,
      searchText: opts.search,
      minAmount: opts.minAmount,
      maxAmount: opts.maxAmount,
      offset: opts.offset ?? opts.skip,
      limit: opts.limit ?? opts.take,
    }) ?? {}
  );
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
  .option("--search <text>", "Search description or notes")
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
