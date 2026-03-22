import { Command } from "commander";
import { apiRequest } from "../../lib/api-client.js";
import { output } from "../../lib/output.js";
import { buildBody } from "../../lib/body-builder.js";

export const updateLoanCommand = new Command("update")
  .description("Update a loan")
  .argument("<id>", "Loan ID")
  .option("--name <name>", "Loan name")
  .option("--account-id <id>", "Payment account ID")
  .option("--is-primary", "Set as primary")
  .option("--no-is-primary", "Unset primary")
  .option("--is-archived", "Archive loan")
  .option("--no-is-archived", "Unarchive loan")
  .option("--first-due-date <date>", "First due date (YYYY-MM-DD)")
  .option("--interval-unit <unit>", "Interval unit (DAY|WEEK|MONTH|YEAR)")
  .option("--interval-count <n>", "Interval count")
  .option("--agreed-installments <n>", "Total installments")
  .option("--target-payment <amount>", "Target payment amount")
  .option("--interest-rate <rate>", "Interest rate")
  .option("--interest-rate-unit <unit>", "Rate unit (ANNUAL|MONTHLY)")
  .option("--interest-enabled", "Enable interest")
  .option("--no-interest-enabled", "Disable interest")
  .option("--late-fee-amount <amount>", "Late fee amount")
  .option("--late-fee-grace-days <n>", "Late fee grace days")
  .option("--late-fee-enabled", "Enable late fees")
  .option("--no-late-fee-enabled", "Disable late fees")
  .action(async (id, opts) => {
    const body = buildBody(opts, [
      { opt: "name", body: "name" },
      { opt: "accountId", body: "paymentAccountId" },
      { opt: "isPrimary", body: "isPrimary", type: "boolean" },
      { opt: "isArchived", body: "isArchived", type: "boolean" },
      { opt: "firstDueDate", body: "firstDueDate" },
      { opt: "intervalUnit", body: "intervalUnit" },
      { opt: "intervalCount", body: "intervalCount", type: "number" },
      { opt: "agreedInstallments", body: "agreedInstallments", type: "number" },
      { opt: "targetPayment", body: "targetPayment", type: "number" },
      { opt: "interestRate", body: "interestRate", type: "number" },
      { opt: "interestRateUnit", body: "interestRateUnit" },
      { opt: "interestEnabled", body: "interestEnabled", type: "boolean" },
      { opt: "lateFeeAmount", body: "lateFeeAmount", type: "number" },
      { opt: "lateFeeGraceDays", body: "lateFeeGraceDays", type: "number" },
      { opt: "lateFeeEnabled", body: "lateFeeEnabled", type: "boolean" },
    ]);
    const data = await apiRequest("PUT", `/api/loans/${id}`, body);
    output.success(data);
  });
