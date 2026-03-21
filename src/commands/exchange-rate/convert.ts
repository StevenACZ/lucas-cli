import { Command } from "commander";
import { apiRequest } from "../../lib/api-client.js";
import { output } from "../../lib/output.js";

export const convertCommand = new Command("convert")
  .description("Convert between currencies")
  .option("--from <currency>", "Source currency")
  .option("--to <currency>", "Target currency")
  .option("--amount <amount>", "Amount to convert")
  .action(async (opts) => {
    const params: Record<string, string> = {};
    if (opts.from) params.from = opts.from;
    if (opts.to) params.to = opts.to;
    if (opts.amount) params.amount = opts.amount;

    const data = await apiRequest(
      "GET",
      "/api/exchange-rate/convert",
      undefined,
      params,
    );
    output.success(data);
  });
