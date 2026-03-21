import { Command } from "commander";
import { apiRequest } from "../../lib/api-client.js";
import { output } from "../../lib/output.js";

export const createTransferCommand = new Command("create")
  .description("Create a new transfer")
  .requiredOption("--from-account-id <id>", "Source account ID")
  .requiredOption("--to-account-id <id>", "Destination account ID")
  .requiredOption("--amount <amount>", "Transfer amount")
  .option("--description <desc>", "Transfer description")
  .option("--exchange-rate <rate>", "Exchange rate")
  .action(async (opts) => {
    const body: Record<string, unknown> = {
      fromAccountId: opts.fromAccountId,
      toAccountId: opts.toAccountId,
      amount: Number(opts.amount),
    };
    if (opts.description) body.description = opts.description;
    if (opts.exchangeRate) body.exchangeRate = Number(opts.exchangeRate);

    const data = await apiRequest("POST", "/api/transfers", body);
    output.success(data);
  });
