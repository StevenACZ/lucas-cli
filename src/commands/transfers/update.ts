import { Command } from "commander";
import { apiRequest } from "../../lib/api-client.js";
import { output } from "../../lib/output.js";
import { buildBody } from "../../lib/body-builder.js";

export const updateTransferCommand = new Command("update")
  .description("Update a transfer")
  .argument("<id>", "Transfer ID")
  .requiredOption("--amount <amount>", "Transfer amount")
  .option("--to-amount <amount>", "Destination amount (cross-currency)")
  .option("--description <desc>", "Description")
  .option("--date <date>", "Date (YYYY-MM-DD)")
  .option("--notes <notes>", "Notes")
  .option("--exchange-rate <rate>", "Exchange rate")
  .action(async (id, opts) => {
    const body = buildBody(opts, [
      { opt: "amount", body: "amount", type: "number" },
      { opt: "toAmount", body: "toAmount", type: "number" },
      { opt: "description", body: "description" },
      { opt: "date", body: "date" },
      { opt: "notes", body: "notes" },
      { opt: "exchangeRate", body: "exchangeRate", type: "number" },
    ]);
    const data = await apiRequest("PUT", `/api/transfers/${id}`, body);
    output.success(data);
  });
