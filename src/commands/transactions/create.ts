import { Command } from "commander";
import { apiRequest } from "../../lib/api-client.js";
import { output } from "../../lib/output.js";
import { buildBody } from "../../lib/body-builder.js";

export const createTransactionCommand = new Command("create")
  .description("Create a new transaction")
  .requiredOption("--account-id <id>", "Account ID")
  .requiredOption("--amount <amount>", "Transaction amount")
  .requiredOption("--type <type>", "Type (INCOME|EXPENSE)")
  .requiredOption("--description <desc>", "Transaction description")
  .option("--category-id <id>", "Category ID")
  .option("--date <date>", "Transaction date (YYYY-MM-DD)")
  .option("--notes <notes>", "Additional notes")
  .option(
    "--cashback-amount <amount>",
    "Explicit cashback earned (CREDIT expenses with cashback enabled)",
  )
  .action(async (opts) => {
    const body = buildBody(opts, [
      { opt: "accountId", body: "accountId" },
      { opt: "amount", body: "amount", type: "number" },
      { opt: "type", body: "type" },
      { opt: "description", body: "description" },
      { opt: "categoryId", body: "categoryId" },
      { opt: "date", body: "date" },
      { opt: "notes", body: "notes" },
      { opt: "cashbackAmount", body: "cashbackAmount", type: "number" },
    ]);
    const data = await apiRequest("POST", "/api/transactions", body);
    output.success(data);
  });
