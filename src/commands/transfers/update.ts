import { Command } from "commander";
import { apiRequest } from "../../lib/api-client.js";
import { output } from "../../lib/output.js";
import { buildBody } from "../../lib/body-builder.js";

export const updateTransferCommand = new Command("update")
  .description("Update a transfer")
  .argument("<id>", "Transfer ID")
  .requiredOption("--amount <amount>", "Transfer amount")
  .option("--to-amount <amount>", "Destination amount (cross-currency)")
  .option("--clear-to-amount", "Clear destination amount")
  .option("--description <desc>", "Description")
  .option("--clear-description", "Clear description")
  .option("--date <date>", "Date (YYYY-MM-DD)")
  .option("--notes <notes>", "Notes")
  .option("--clear-notes", "Clear notes")
  .option("--exchange-rate <rate>", "Exchange rate")
  .option("--clear-exchange-rate", "Clear exchange rate")
  .action(async (id, opts) => {
    const body = buildBody(opts, [
      { opt: "amount", body: "amount", type: "number" },
      {
        opt: "toAmount",
        body: "toAmount",
        type: "number",
        clearOpt: "clearToAmount",
      },
      {
        opt: "description",
        body: "description",
        clearOpt: "clearDescription",
      },
      { opt: "date", body: "date" },
      { opt: "notes", body: "notes", clearOpt: "clearNotes" },
      {
        opt: "exchangeRate",
        body: "exchangeRate",
        type: "number",
        clearOpt: "clearExchangeRate",
      },
    ]);
    const data = await apiRequest("PUT", `/api/transfers/${id}`, body);
    output.success(data);
  });
