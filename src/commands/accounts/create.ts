import { Command } from "commander";
import { apiRequest } from "../../lib/api-client.js";
import { output } from "../../lib/output.js";

export const createAccountCommand = new Command("create")
  .description("Create a new account")
  .requiredOption("--name <name>", "Account name")
  .requiredOption(
    "--type <type>",
    "Account type (DEBIT|CREDIT|CASH|SAVINGS|INVESTMENT|WALLET)",
  )
  .requiredOption("--bank <bank>", "Bank name")
  .option("--currency <currency>", "Currency code", "PEN")
  .option("--balance <balance>", "Initial balance")
  .option("--credit-limit <limit>", "Credit limit")
  .option("--color <color>", "Account color")
  .option("--icon <icon>", "Account icon")
  .action(async (opts) => {
    const body: Record<string, unknown> = {
      name: opts.name,
      type: opts.type,
      bank: opts.bank,
      currency: opts.currency,
    };
    if (opts.balance) body.balance = Number(opts.balance);
    if (opts.creditLimit) body.creditLimit = Number(opts.creditLimit);
    if (opts.color) body.color = opts.color;
    if (opts.icon) body.icon = opts.icon;

    const data = await apiRequest("POST", "/api/accounts", body);
    output.success(data);
  });
