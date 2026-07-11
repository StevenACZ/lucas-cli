import { Command } from "commander";
import { apiRequest } from "../../lib/api-client.js";
import { compactParams } from "../../lib/query-params.js";
import { output } from "../../lib/output.js";
import { resourcePath } from "../../lib/resource-path.js";

export const balanceHistoryCommand = new Command("balance-history")
  .description("Daily balance history for an account")
  .argument("<id>", "Account ID")
  .option(
    "--range <range>",
    "History range: 7d | 14d | month | year (default: month to date)",
  )
  .option("--anchor-date <date>", "Local day pivot (YYYY-MM-DD)")
  .action(async (id: string, opts) => {
    const data = await apiRequest(
      "GET",
      resourcePath("/api/accounts", id, "balance-history"),
      undefined,
      compactParams({ range: opts.range, anchorDate: opts.anchorDate }),
    );
    output.success(data);
  });
