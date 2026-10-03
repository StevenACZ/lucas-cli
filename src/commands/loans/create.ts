import { Command, Option } from "commander";
import { apiRequest } from "../../lib/api-client.js";
import { output } from "../../lib/output.js";
import { buildBody } from "../../lib/body-builder.js";
import { choice } from "../../lib/choices.js";
import { invalidValue } from "../../lib/errors.js";
import {
  hexColor,
  loanAppearanceBody,
  type LoanAppearanceOptions,
  LOAN_ICON_NAMES,
  withoutImageData,
} from "../../lib/loan-appearance.js";
import { resolveAccountId } from "../../lib/resolve.js";
import { stripHeavy } from "../../lib/views.js";

export const createLoanCommand = new Command("create")
  .description("Create a new loan")
  .requiredOption("--name <name>", "Loan name")
  .requiredOption("--principal <amount>", "Principal amount")
  .requiredOption("--currency <code>", "ISO currency code, e.g. PEN or USD")
  .requiredOption("--first-due-date <date>", "First due date (YYYY-MM-DD)")
  .requiredOption(
    "--interval-unit <unit>",
    "DAY, WEEK, MONTH or YEAR",
    choice(["DAY", "WEEK", "MONTH", "YEAR"]),
  )
  .requiredOption(
    "--interval-count <n>",
    "Intervals between installments (integer)",
  )
  .option("--account <name|id>", "Default paying account name or id")
  .addOption(new Option("--account-id <id>").hideHelp())
  .option("--agreed-installments <n>", "Total installments")
  .option("--target-payment <amount>", "Target payment amount")
  .option("--interest-rate <rate>", "Interest rate percent")
  .option(
    "--interest-rate-unit <unit>",
    "ANNUAL or MONTHLY",
    choice(["ANNUAL", "MONTHLY"]),
  )
  .option("--interest-enabled", "Enable interest")
  .option("--late-fee-amount <amount>", "Late fee amount")
  .option("--late-fee-grace-days <n>", "Late fee grace days")
  .option("--late-fee-enabled", "Enable late fees")
  .option(
    "--icon <name>",
    "Icon name (see: lucas loans icons)",
    choice(LOAN_ICON_NAMES),
  )
  .option(
    "--color <hex>",
    "Icon color (#RRGGBB); defaults to the icon's own color",
    hexColor,
  )
  .option("--image <path>", "JPEG photo, at most 256 KB and 1024 px per side")
  .option("--is-primary", "Set as primary")
  .option(
    "--disbursement-account <name|id>",
    "Record the money received as income in this account",
  )
  .option(
    "--disbursement-amount <amount>",
    "Amount received, in the account currency (defaults to the principal)",
  )
  .option(
    "--disbursement-exchange-rate <rate>",
    "Exchange rate when the account currency differs from the loan",
  )
  .option("--dry-run", "Resolve and validate, print the request, write nothing")
  .addHelpText(
    "after",
    `
Examples:
  lucas loans create --name "Car" --principal 12000 --currency PEN \\
    --first-due-date 2026-11-05 --interval-unit MONTH --interval-count 1 \\
    --agreed-installments 24 --icon car --dry-run
  lucas loans create --name "Laptop" --principal 900 --currency USD \\
    --first-due-date 2026-11-01 --interval-unit MONTH --interval-count 1 \\
    --agreed-installments 6 --image ./laptop.jpg --disbursement-account "BCP Dollars"
`,
  )
  .action(runCreateLoan);

export async function runCreateLoan(
  opts: Record<string, unknown>,
): Promise<void> {
  opts.accountId = await resolveAccountId(
    (opts.account ?? opts.accountId) as string | undefined,
  );
  const disbursementAccountId = await resolveAccountId(
    opts.disbursementAccount as string | undefined,
  );
  if (
    !disbursementAccountId &&
    (opts.disbursementAmount !== undefined ||
      opts.disbursementExchangeRate !== undefined)
  ) {
    throw invalidValue(
      "--disbursement-amount and --disbursement-exchange-rate need --disbursement-account",
    );
  }
  const body = {
    ...buildBody(opts, [
      { opt: "name", body: "name" },
      { opt: "principal", body: "principal", type: "number" },
      { opt: "currency", body: "currency" },
      { opt: "firstDueDate", body: "firstDueDate" },
      { opt: "intervalUnit", body: "intervalUnit" },
      { opt: "intervalCount", body: "intervalCount", type: "number" },
      { opt: "accountId", body: "paymentAccountId" },
      { opt: "agreedInstallments", body: "agreedInstallments", type: "number" },
      { opt: "targetPayment", body: "targetPayment", type: "number" },
      { opt: "interestRate", body: "interestRate", type: "number" },
      { opt: "interestRateUnit", body: "interestRateUnit" },
      { opt: "interestEnabled", body: "interestEnabled", type: "boolean" },
      { opt: "lateFeeAmount", body: "lateFeeAmount", type: "number" },
      { opt: "lateFeeGraceDays", body: "lateFeeGraceDays", type: "number" },
      { opt: "lateFeeEnabled", body: "lateFeeEnabled", type: "boolean" },
      { opt: "isPrimary", body: "isPrimary", type: "boolean" },
      {
        opt: "disbursementAmount",
        body: "disbursementPayAmount",
        type: "number",
      },
      {
        opt: "disbursementExchangeRate",
        body: "disbursementExchangeRate",
        type: "number",
      },
    ]),
    ...(disbursementAccountId
      ? { recordDisbursement: true, disbursementAccountId }
      : {}),
    ...(await loanAppearanceBody(opts as LoanAppearanceOptions)),
  };
  if (opts.dryRun) {
    output.success({
      dryRun: true,
      request: {
        method: "POST",
        path: "/api/loans",
        body: withoutImageData(body),
      },
    });
    return;
  }
  const data = await apiRequest("POST", "/api/loans", body);
  output.success(stripHeavy(data));
}
