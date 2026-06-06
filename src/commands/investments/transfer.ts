import { Command } from "commander";
import { apiRequest } from "../../lib/api-client.js";
import { buildBody } from "../../lib/body-builder.js";
import { output } from "../../lib/output.js";

export const investmentTransferCommand = new Command("transfer")
  .description(
    "Transfer cash between an investment account and another account",
  )
  .requiredOption("--from-account-id <id>", "Source account ID")
  .requiredOption("--to-account-id <id>", "Destination account ID")
  .requiredOption("--amount <amount>", "Source amount")
  .option("--to-amount <amount>", "Destination amount (cross-currency)")
  .option("--exchange-rate <rate>", "Exchange rate")
  .option("--date <date>", "Transfer date (YYYY-MM-DD)")
  .option("--description <desc>", "Transfer description")
  .option("--notes <notes>", "Transfer notes")
  .action(async (opts) => {
    const body = buildBody(opts, [
      { opt: "fromAccountId", body: "fromAccountId" },
      { opt: "toAccountId", body: "toAccountId" },
      { opt: "amount", body: "amount", type: "number" },
      { opt: "toAmount", body: "toAmount", type: "number" },
      { opt: "exchangeRate", body: "exchangeRate", type: "number" },
      { opt: "date", body: "date" },
      { opt: "description", body: "description" },
      { opt: "notes", body: "notes" },
    ]);
    const data = await apiRequest("POST", "/api/transfers", body);
    output.success(data);
  });
