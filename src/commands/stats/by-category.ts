import { Command } from "commander";
import { apiRequest } from "../../lib/api-client.js";
import { output } from "../../lib/output.js";

export const byCategoryCommand = new Command("by-category")
  .description("Get statistics by category")
  .option("--currency <code>", "Currency code")
  .action(async (opts) => {
    const params: Record<string, string> = {};
    if (opts.currency) params.currency = opts.currency;
    const data = await apiRequest(
      "GET",
      "/api/stats/by-category",
      undefined,
      params,
    );
    output.success(data);
  });
