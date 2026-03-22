import { Command } from "commander";
import { apiRequest } from "../../lib/api-client.js";
import { output } from "../../lib/output.js";
import { buildBody } from "../../lib/body-builder.js";

export const updateAccountCommand = new Command("update")
  .description("Update an account")
  .argument("<id>", "Account ID")
  .option("--name <name>", "Account name")
  .option("--bank <bank>", "Bank name")
  .option("--color <color>", "Account color")
  .option("--icon <icon>", "Account icon")
  .option("--balance <amount>", "Account balance")
  .option("--credit-limit <amount>", "Credit limit")
  .option("--current-debt <amount>", "Current debt")
  .option("--statement-closing-day <day>", "Statement closing day")
  .option("--display-order <n>", "Display order")
  .option("--excluded", "Exclude from totals")
  .option("--no-excluded", "Include in totals")
  .option("--is-archived", "Archive account")
  .option("--no-is-archived", "Unarchive account")
  .action(async (id: string, opts) => {
    const body = buildBody(opts, [
      { opt: "name", body: "name" },
      { opt: "bank", body: "bank" },
      { opt: "color", body: "color" },
      { opt: "icon", body: "icon" },
      { opt: "balance", body: "balance", type: "number" },
      { opt: "creditLimit", body: "creditLimit", type: "number" },
      { opt: "currentDebt", body: "currentDebt", type: "number" },
      {
        opt: "statementClosingDay",
        body: "statementClosingDay",
        type: "number",
      },
      { opt: "displayOrder", body: "displayOrder", type: "number" },
      { opt: "excluded", body: "excluded", type: "boolean" },
      { opt: "isArchived", body: "isArchived", type: "boolean" },
    ]);
    const data = await apiRequest("PUT", `/api/accounts/${id}`, body);
    output.success(data);
  });
