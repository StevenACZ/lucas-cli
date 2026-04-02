import { Command } from "commander";
import { apiRequest } from "../../lib/api-client.js";
import { output } from "../../lib/output.js";
import { buildBody } from "../../lib/body-builder.js";

export const updateLoanCommand = new Command("update")
  .description("Update a loan")
  .argument("<id>", "Loan ID")
  .option("--name <name>", "Loan name")
  .option("--principal <amount>", "Principal amount")
  .option("--account-id <id>", "Payment account ID")
  .option("--clear-account-id", "Clear payment account ID")
  .option("--is-primary", "Set as primary")
  .option("--no-is-primary", "Unset primary")
  .option("--is-archived", "Archive loan")
  .option("--no-is-archived", "Unarchive loan")
  .option("--first-due-date <date>", "First due date (YYYY-MM-DD)")
  .option("--interval-unit <unit>", "Interval unit (DAY|WEEK|MONTH|YEAR)")
  .option("--interval-count <n>", "Interval count")
  .option("--agreed-installments <n>", "Total installments")
  .option("--clear-agreed-installments", "Clear agreed installments")
  .option("--target-payment <amount>", "Target payment amount")
  .option("--clear-target-payment", "Clear target payment")
  .option("--interest-rate <rate>", "Interest rate")
  .option("--clear-interest-rate", "Clear interest rate")
  .option("--interest-rate-unit <unit>", "Rate unit (ANNUAL|MONTHLY)")
  .option("--interest-enabled", "Enable interest")
  .option("--no-interest-enabled", "Disable interest")
  .option("--late-fee-amount <amount>", "Late fee amount")
  .option("--clear-late-fee-amount", "Clear late fee amount")
  .option("--late-fee-grace-days <n>", "Late fee grace days")
  .option("--late-fee-enabled", "Enable late fees")
  .option("--no-late-fee-enabled", "Disable late fees")
  .action(async (id, opts) => {
    const body = buildBody(opts, [
      { opt: "name", body: "name" },
      { opt: "principal", body: "principal", type: "number" },
      {
        opt: "accountId",
        body: "paymentAccountId",
        clearOpt: "clearAccountId",
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
    const data = await apiRequest("PUT", `/api/loans/${id}`, body);
    output.success(data);
  });
