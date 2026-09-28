import { Command, Option } from "commander";
import { apiRequest } from "../../lib/api-client.js";
import { output } from "../../lib/output.js";
import { buildBody } from "../../lib/body-builder.js";
import { choice } from "../../lib/choices.js";
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
  .action(async (opts) => {
    opts.accountId = await resolveAccountId(opts.account ?? opts.accountId);
    const body = buildBody(opts, [
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
    ]);
    const data = await apiRequest("POST", "/api/loans", body);
    output.success(stripHeavy(data));
  });
