import { Command } from "commander";
import { apiRequest } from "../../lib/api-client.js";
import { output } from "../../lib/output.js";

export const monthlyCommand = new Command("monthly")
  .description("Get monthly statistics")
  .option("--currency <code>", "Currency code")
  .option("--months <n>", "Number of months")
  .action(async (opts) => {
    const params: Record<string, string> = {};
    if (opts.currency) params.currency = opts.currency;
    if (opts.months) params.months = opts.months;
    const data = await apiRequest(
      "GET",
      "/api/stats/monthly",
      undefined,
      params,
    );
    output.success(data);
  });
