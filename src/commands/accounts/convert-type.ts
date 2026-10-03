import { Command } from "commander";
import { apiRequest } from "../../lib/api-client.js";
import { buildBody } from "../../lib/body-builder.js";
import { choice } from "../../lib/choices.js";
import { invalidValue } from "../../lib/errors.js";
import { output } from "../../lib/output.js";
import { resolveAccountId } from "../../lib/resolve.js";
import { resourcePath } from "../../lib/resource-path.js";
import { accountView, stripHeavy } from "../../lib/views.js";

const TARGET_TYPES = ["DEBIT", "CREDIT", "CASH", "SAVINGS", "WALLET"];

export const convertAccountTypeCommand = new Command("convert-type")
  .description("Convert an account to another type")
  .argument("<account>", "Account name or id")
  .requiredOption(
    "--type <type>",
    "DEBIT, CREDIT, CASH, SAVINGS or WALLET",
    choice(TARGET_TYPES),
  )
  .option("--credit-limit <amount>", "Credit limit (required for CREDIT)")
  .option(
    "--statement-closing-day <day>",
    "Statement closing day (1..31, CREDIT only)",
  )
  .option("--dry-run", "Resolve and validate, print the request, write nothing")
  .addHelpText(
    "after",
    `
Converting to CREDIT needs --credit-limit and sets the balance to 0. The debt
is then what the account's movements add up to (expenses minus incomes), so
convert an account without movements to start at 0. Any other target keeps the
balance and clears the credit fields. A CREDIT account with debt or a credit
balance cannot be converted.

Examples:
  lucas accounts convert-type "Ahorros" --type DEBIT
  lucas accounts convert-type "Soles" --type CREDIT --credit-limit 5000 \\
    --statement-closing-day 20 --dry-run
`,
  )
  .action(async (ref: string, opts) => {
    const toCredit = opts.type === "CREDIT";
    if (toCredit && opts.creditLimit === undefined) {
      throw invalidValue("--credit-limit is required when --type is CREDIT");
    }
    if (!toCredit && opts.creditLimit !== undefined) {
      throw invalidValue("--credit-limit only applies when --type is CREDIT", {
        value: opts.creditLimit,
      });
    }
    if (!toCredit && opts.statementClosingDay !== undefined) {
      throw invalidValue(
        "--statement-closing-day only applies when --type is CREDIT",
        { value: opts.statementClosingDay },
      );
    }
    const body = buildBody(opts, [
      { opt: "type", body: "newType" },
      { opt: "creditLimit", body: "creditLimit", type: "number" },
      {
        opt: "statementClosingDay",
        body: "statementClosingDay",
        type: "number",
      },
    ]);
    const day = body.statementClosingDay;
    if (
      day !== undefined &&
      (!Number.isInteger(day) || Number(day) < 1 || Number(day) > 31)
    ) {
      throw invalidValue(
        "--statement-closing-day must be an integer between 1 and 31",
        { value: opts.statementClosingDay },
      );
    }
    const id = String(await resolveAccountId(ref));
    const path = resourcePath("/api/accounts", id, "convert-type");
    if (opts.dryRun) {
      output.success({ dryRun: true, request: { method: "POST", path, body } });
      return;
    }
    const data = await apiRequest<Record<string, unknown>>("POST", path, body);
    output.success({
      ...stripHeavy(data),
      account: accountView((data.account ?? {}) as Record<string, unknown>),
    });
  });
