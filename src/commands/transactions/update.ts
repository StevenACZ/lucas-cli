import { Command } from "commander";
import { apiRequest } from "../../lib/api-client.js";
import { output } from "../../lib/output.js";
import { buildBody } from "../../lib/body-builder.js";

export const updateTransactionCommand = new Command("update")
  .description("Update a transaction")
  .argument("<id>", "Transaction ID")
  .option("--description <desc>", "Transaction description")
  .option("--amount <amount>", "Transaction amount")
  .option("--type <type>", "Type (INCOME|EXPENSE)")
  .option("--date <date>", "Date (YYYY-MM-DD)")
  .option("--category-id <id>", "Category ID")
  .option("--clear-category-id", "Clear category")
  .option("--notes <notes>", "Additional notes")
  .option("--clear-notes", "Clear notes")
  .option("--merchant <merchant>", "Merchant name")
  .option("--clear-merchant", "Clear merchant")
  .action(async (id: string, opts) => {
    const body = buildBody(opts, [
      { opt: "description", body: "description" },
      { opt: "amount", body: "amount", type: "number" },
      { opt: "type", body: "type" },
      { opt: "date", body: "date" },
      { opt: "categoryId", body: "categoryId", clearOpt: "clearCategoryId" },
      { opt: "notes", body: "notes", clearOpt: "clearNotes" },
      { opt: "merchant", body: "merchant", clearOpt: "clearMerchant" },
    ]);
    const data = await apiRequest("PUT", `/api/transactions/${id}`, body);
    output.success(data);
  });
