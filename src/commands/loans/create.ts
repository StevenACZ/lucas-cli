import { Command } from "commander";
import { apiRequest } from "../../lib/api-client.js";
import { output } from "../../lib/output.js";

export const createLoanCommand = new Command("create")
  .description("Create a new loan")
  .requiredOption("--name <name>", "Loan name")
  .requiredOption("--principal <amount>", "Principal amount")
  .requiredOption("--account-id <id>", "Account ID")
  .option("--interest-rate <rate>", "Interest rate")
  .option("--installments <n>", "Number of installments")
  .option("--start-date <date>", "Start date (YYYY-MM-DD)")
  .action(async (opts) => {
    const body: Record<string, unknown> = {
      name: opts.name,
      principal: Number(opts.principal),
      accountId: opts.accountId,
    };
    if (opts.interestRate) body.interestRate = Number(opts.interestRate);
    if (opts.installments) body.installments = Number(opts.installments);
    if (opts.startDate) body.startDate = opts.startDate;

    const data = await apiRequest("POST", "/api/loans", body);
    output.success(data);
  });
