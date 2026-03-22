import { Command } from "commander";
import { apiRequest } from "../../lib/api-client.js";
import { output } from "../../lib/output.js";

export const summaryCommand = new Command("summary")
  .description("Get financial summary")
  .option("--currency <code>", "Currency code")
  .action(async (opts) => {
    const params: Record<string, string> = {};
    if (opts.currency) params.currency = opts.currency;
    const data = await apiRequest(
      "GET",
      "/api/stats/summary",
      undefined,
      params,
    );
    output.success(data);
  });
