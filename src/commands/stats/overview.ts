import { Command } from "commander";
import { apiRequest } from "../../lib/api-client.js";
import { setOptionalIntegerQueryParam } from "../../lib/query-params.js";
import { output } from "../../lib/output.js";

export const overviewCommand = new Command("overview")
  .description(
    "Full stats for one period in a single call: current vs previous window, chart series, and category breakdown",
  )
  .option(
    "--period <period>",
    "Period window: WEEK | MONTH | SIX_MONTHS | YEAR",
    "MONTH",
  )
  .option("--currency <code>", "Currency code")
  .option(
    "--offset <n>",
    "Whole windows back from the current one (0 = current)",
  )
  .action(async (opts) => {
    const params: Record<string, string> = {};
    if (opts.period) params.period = String(opts.period).toUpperCase();
    if (opts.currency) params.currency = opts.currency;
    setOptionalIntegerQueryParam(params, {
      value: opts.offset,
      flag: "--offset",
      queryKey: "offset",
      min: 0,
      max: 520,
    });
    const data = await apiRequest(
      "GET",
      "/api/stats/overview",
      undefined,
      params,
    );
    output.success(data);
  });
