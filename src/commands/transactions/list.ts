import { Command } from "commander";
import { apiRequest } from "../../lib/api-client.js";
import { output } from "../../lib/output.js";

export const listTransactionsCommand = new Command("list")
  .description("List transactions")
  .option("--from <date>", "Start date (YYYY-MM-DD)")
  .option("--to <date>", "End date (YYYY-MM-DD)")
  .option("--category-id <id>", "Filter by category")
  .option("--account-id <id>", "Filter by account")
  .option("--type <type>", "Filter by type (INCOME|EXPENSE)")
  .option("--skip <n>", "Skip N records")
  .option("--take <n>", "Take N records")
  .action(async (opts) => {
    const params: Record<string, string> = {};
    if (opts.from) params.from = opts.from;
    if (opts.to) params.to = opts.to;
    if (opts.categoryId) params.categoryId = opts.categoryId;
    if (opts.accountId) params.accountId = opts.accountId;
    if (opts.type) params.type = opts.type;
    if (opts.skip) params.skip = opts.skip;
    if (opts.take) params.take = opts.take;

    const data = await apiRequest(
      "GET",
      "/api/transactions",
      undefined,
      params,
    );
    output.success(data);
  });
