import { Command } from "commander";
import { apiRequest } from "../../lib/api-client.js";
import { output } from "../../lib/output.js";

export const updateTransactionCommand = new Command("update")
  .description("Update a transaction")
  .argument("<id>", "Transaction ID")
  .option("--description <desc>", "Transaction description")
  .option("--amount <amount>", "Transaction amount")
  .option("--category-id <id>", "Category ID")
  .option("--notes <notes>", "Additional notes")
  .option("--merchant <merchant>", "Merchant name")
  .action(async (id: string, opts) => {
    const body: Record<string, unknown> = {};
    if (opts.description) body.description = opts.description;
    if (opts.amount) body.amount = Number(opts.amount);
    if (opts.categoryId) body.categoryId = opts.categoryId;
    if (opts.notes) body.notes = opts.notes;
    if (opts.merchant) body.merchant = opts.merchant;

    const data = await apiRequest("PUT", `/api/transactions/${id}`, body);
    output.success(data);
  });
