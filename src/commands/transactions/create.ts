import { Command } from "commander";
import { apiRequest } from "../../lib/api-client.js";
import { output } from "../../lib/output.js";

export const createTransactionCommand = new Command("create")
  .description("Create a new transaction")
  .requiredOption("--account-id <id>", "Account ID")
  .requiredOption("--amount <amount>", "Transaction amount")
  .requiredOption("--type <type>", "Type (INCOME|EXPENSE)")
  .requiredOption("--description <desc>", "Transaction description")
  .option("--category-id <id>", "Category ID")
  .option("--date <date>", "Transaction date (YYYY-MM-DD)")
  .option("--notes <notes>", "Additional notes")
  .option("--merchant <merchant>", "Merchant name")
  .action(async (opts) => {
    const body: Record<string, unknown> = {
      accountId: opts.accountId,
      amount: Number(opts.amount),
      type: opts.type,
      description: opts.description,
    };
    if (opts.categoryId) body.categoryId = opts.categoryId;
    if (opts.date) body.date = opts.date;
    if (opts.notes) body.notes = opts.notes;
    if (opts.merchant) body.merchant = opts.merchant;

    const data = await apiRequest("POST", "/api/transactions", body);
    output.success(data);
  });
