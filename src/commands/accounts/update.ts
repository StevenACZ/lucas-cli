import { Command } from "commander";
import { apiRequest } from "../../lib/api-client.js";
import { output } from "../../lib/output.js";
import { buildBody } from "../../lib/body-builder.js";
import { resolveAccountId } from "../../lib/resolve.js";
import { resourcePath } from "../../lib/resource-path.js";
import { accountView } from "../../lib/views.js";

export const updateAccountCommand = new Command("update")
  .description("Update an account")
  .argument("<account>", "Account name or id")
  .option("--name <name>", "Account name")
  .option("--bank <bank>", "Bank name")
  .option("--currency <currency>", "Currency code")
  .option("--color <color>", "Account color (#RRGGBB)")
  .option("--clear-color", "Clear account color")
  .option("--icon <icon>", "Account icon name")
  .option("--clear-icon", "Clear account icon")
  .option("--balance <amount>", "Set the balance (number)")
  .option("--credit-limit <amount>", "Credit limit (CREDIT only)")
  .option("--clear-credit-limit", "Clear credit limit")
  .option("--current-debt <amount>", "Current debt (CREDIT only)")
  .option("--clear-current-debt", "Clear current debt")
  .option(
    "--statement-closing-day <day>",
    "Statement closing day, 1..31 (CREDIT only)",
  )
  .option("--clear-statement-closing-day", "Clear statement closing day")
  .option("--cashback-enabled", "Enable cashback (CREDIT only)")
  .option("--no-cashback-enabled", "Disable cashback")
  .option(
    "--cashback-rate <pct>",
    "Cashback rate percent per purchase (0.01..100, CREDIT only)",
  )
  .option("--clear-cashback-rate", "Clear cashback rate")
  .option("--display-order <n>", "Display order (integer)")
  .option("--excluded", "Exclude from totals")
  .option("--no-excluded", "Include in totals")
  .option("--vault", "Mark as savings vault (cannot fund payments)")
  .option("--no-vault", "Clear the savings vault flag")
  .option("--is-archived", "Archive account")
  .option("--no-is-archived", "Unarchive account")
  .addHelpText(
    "after",
    `
Examples:
  lucas accounts update "Visa Signature" --statement-closing-day 20
  lucas accounts update "Efectivo" --name "Cash" --excluded
`,
  )
  .action(async (ref: string, opts) => {
    const id = String(await resolveAccountId(ref));
    const body = buildBody(opts, [
      { opt: "name", body: "name" },
      { opt: "bank", body: "bank" },
      { opt: "currency", body: "currency" },
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
      { opt: "cashbackEnabled", body: "cashbackEnabled", type: "boolean" },
      {
        opt: "cashbackRate",
        body: "cashbackRate",
        type: "number",
        clearOpt: "clearCashbackRate",
      },
      { opt: "displayOrder", body: "displayOrder", type: "number" },
      { opt: "excluded", body: "excluded", type: "boolean" },
      { opt: "vault", body: "vault", type: "boolean" },
      { opt: "isArchived", body: "isArchived", type: "boolean" },
    ]);
    const account = await apiRequest<Record<string, unknown>>(
      "PUT",
      resourcePath("/api/accounts", id),
      body,
    );
    output.success({ account: accountView(account) });
  });
