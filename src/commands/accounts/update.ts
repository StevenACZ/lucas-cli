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
  .option("--clear-color", "Clear account color")
  .option("--icon <icon>", "Account icon")
  .option("--clear-icon", "Clear account icon")
  .option("--balance <amount>", "Account balance")
  .option("--credit-limit <amount>", "Credit limit")
  .option("--clear-credit-limit", "Clear credit limit")
  .option("--current-debt <amount>", "Current debt")
  .option("--clear-current-debt", "Clear current debt")
  .option("--statement-closing-day <day>", "Statement closing day")
  .option("--clear-statement-closing-day", "Clear statement closing day")
  .option("--display-order <n>", "Display order")
  .option("--excluded", "Exclude from totals")
  .option("--no-excluded", "Include in totals")
  .option("--is-archived", "Archive account")
  .option("--no-is-archived", "Unarchive account")
  .action(async (id: string, opts) => {
    const body = buildBody(opts, [
      { opt: "name", body: "name" },
      { opt: "bank", body: "bank" },
      { opt: "color", body: "color", clearOpt: "clearColor" },
      { opt: "icon", body: "icon", clearOpt: "clearIcon" },
      { opt: "balance", body: "balance", type: "number" },
      {
        opt: "creditLimit",
        body: "creditLimit",
        type: "number",
        clearOpt: "clearCreditLimit",
      },
      {
        opt: "currentDebt",
        body: "currentDebt",
        type: "number",
        clearOpt: "clearCurrentDebt",
      },
      {
        opt: "statementClosingDay",
        body: "statementClosingDay",
        type: "number",
        clearOpt: "clearStatementClosingDay",
      },
      { opt: "displayOrder", body: "displayOrder", type: "number" },
      { opt: "excluded", body: "excluded", type: "boolean" },
      { opt: "isArchived", body: "isArchived", type: "boolean" },
    ]);
    const data = await apiRequest("PUT", `/api/accounts/${id}`, body);
    output.success(data);
  });
