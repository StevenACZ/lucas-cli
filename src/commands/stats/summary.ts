import { Command } from "commander";
import { apiRequest } from "../../lib/api-client.js";
import { setOptionalIntegerQueryParam } from "../../lib/query-params.js";
import { output } from "../../lib/output.js";

export const summaryCommand = new Command("summary")
  .description("Get financial summary")
  .option("--currency <code>", "Currency code")
  .option("--year <year>", "Target year")
  .option("--month <month>", "Target month (1-12)")
  .action(async (opts) => {
    const params: Record<string, string> = {};
    if (opts.currency) params.currency = opts.currency;
    setOptionalIntegerQueryParam(params, {
      value: opts.year,
      flag: "--year",
      queryKey: "year",
      min: 2000,
      max: 2100,
    });
    setOptionalIntegerQueryParam(params, {
      value: opts.month,
      flag: "--month",
      queryKey: "month",
      min: 1,
      max: 12,
    });
    const data = await apiRequest(
      "GET",
      "/api/stats/summary",
      undefined,
      params,
    );
    output.success(data);
  });
