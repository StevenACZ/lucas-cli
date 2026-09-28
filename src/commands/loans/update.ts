import { Command, Option } from "commander";
import { apiRequest } from "../../lib/api-client.js";
import { output } from "../../lib/output.js";
import { buildBody } from "../../lib/body-builder.js";
import { choice } from "../../lib/choices.js";
import { resolveAccountId } from "../../lib/resolve.js";
import { stripHeavy } from "../../lib/views.js";
import { resourcePath } from "../../lib/resource-path.js";

export const updateLoanCommand = new Command("update")
  .description("Update a loan")
  .argument("<id>", "Loan ID")
  .option("--name <name>", "Loan name")
  .option("--principal <amount>", "Principal amount")
  .option("--account <name|id>", "Default paying account name or id")
  .addOption(new Option("--account-id <id>").hideHelp())
  .option("--clear-account", "Unlink the paying account")
  .addOption(new Option("--clear-account-id").hideHelp())
  .option("--is-primary", "Set as primary")
  .option("--no-is-primary", "Unset primary")
  .option("--is-archived", "Archive loan")
  .option("--no-is-archived", "Unarchive loan")
  .option("--first-due-date <date>", "First due date (YYYY-MM-DD)")
  .option(
    "--interval-unit <unit>",
    "DAY, WEEK, MONTH or YEAR",
    choice(["DAY", "WEEK", "MONTH", "YEAR"]),
  )
  .option("--interval-count <n>", "Intervals between installments (integer)")
  .option("--agreed-installments <n>", "Total installments")
  .option("--clear-agreed-installments", "Clear agreed installments")
  .option("--target-payment <amount>", "Target payment amount")
  .option("--clear-target-payment", "Clear target payment")
  .option("--interest-rate <rate>", "Interest rate percent")
  .option("--clear-interest-rate", "Clear interest rate")
  .option(
    "--interest-rate-unit <unit>",
    "ANNUAL or MONTHLY",
    choice(["ANNUAL", "MONTHLY"]),
  )
  .option("--interest-enabled", "Enable interest")
  .option("--no-interest-enabled", "Disable interest")
  .option("--late-fee-amount <amount>", "Late fee amount")
  .option("--clear-late-fee-amount", "Clear late fee amount")
  .option("--late-fee-grace-days <n>", "Late fee grace days")
  .option("--late-fee-enabled", "Enable late fees")
  .option("--no-late-fee-enabled", "Disable late fees")
  .action(async (id, opts) => {
    opts.clearAccount ||= opts.clearAccountId;
    opts.accountId = await resolveAccountId(opts.account ?? opts.accountId);
    const body = buildBody(opts, [
      { opt: "name", body: "name" },
      { opt: "principal", body: "principal", type: "number" },
      {
        opt: "accountId",
        body: "paymentAccountId",
        clearOpt: "clearAccount",
      },
      { opt: "isPrimary", body: "isPrimary", type: "boolean" },
      { opt: "isArchived", body: "isArchived", type: "boolean" },
      { opt: "firstDueDate", body: "firstDueDate" },
      { opt: "intervalUnit", body: "intervalUnit" },
      { opt: "intervalCount", body: "intervalCount", type: "number" },
      {
        opt: "agreedInstallments",
        body: "agreedInstallments",
        type: "number",
        clearOpt: "clearAgreedInstallments",
      },
      {
        opt: "targetPayment",
        body: "targetPayment",
        type: "number",
        clearOpt: "clearTargetPayment",
      },
      {
        opt: "interestRate",
        body: "interestRate",
        type: "number",
        clearOpt: "clearInterestRate",
      },
      { opt: "interestRateUnit", body: "interestRateUnit" },
      { opt: "interestEnabled", body: "interestEnabled", type: "boolean" },
      {
        opt: "lateFeeAmount",
        body: "lateFeeAmount",
        type: "number",
        clearOpt: "clearLateFeeAmount",
      },
      { opt: "lateFeeGraceDays", body: "lateFeeGraceDays", type: "number" },
      { opt: "lateFeeEnabled", body: "lateFeeEnabled", type: "boolean" },
    ]);
    const data = await apiRequest("PUT", resourcePath("/api/loans", id), body);
    output.success(stripHeavy(data));
  });
