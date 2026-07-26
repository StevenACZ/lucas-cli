import { Command } from "commander";
import {
  findNextPayableInstallment,
  getInstallmentRemaining,
} from "../../lib/loan-domain.js";
import type { LoanDetails } from "../../lib/types.js";
import { output } from "../../lib/output.js";
import {
  executePayLoan,
  type PayLoanExecutionResult,
  type PayLoanOptions,
} from "./pay.js";
import { apiRequest } from "../../lib/api-client.js";
import { resourcePath } from "../../lib/resource-path.js";

export interface MarkPaidLoanOptions {
  currency?: string;
  accountId?: string;
  notes?: string;
  paidAt?: string;
  verified?: boolean;
}

export async function executeMarkPaidLoan(
  id: string,
  opts: MarkPaidLoanOptions,
): Promise<PayLoanExecutionResult & Record<string, unknown>> {
  const loan = await apiRequest<LoanDetails>(
    "GET",
    resourcePath("/api/loans", id),
  );
  const installment = findNextPayableInstallment(loan);
  if (!installment) {
    output.error("No pending installment found for this loan", 400, {
      loanId: id,
    });
  }
  const payOpts: PayLoanOptions = {
    amount: getInstallmentRemaining(installment),
    currency: opts.currency,
    accountId: opts.accountId,
    notes: opts.notes,
    paidAt: opts.paidAt,
    verified: opts.verified,
  };
  const result = await executePayLoan(id, payOpts);
  return {
    ...result,
    loanId: id,
    markedInstallment: {
      id: installment.id,
      sequence: installment.sequence,
      dueDate: installment.dueDate,
      remainingAmount: payOpts.amount,
    },
  };
}

export async function runMarkPaidLoan(id: string, opts: MarkPaidLoanOptions) {
  const result = await executeMarkPaidLoan(id, opts);
  output.success(result);
}

export const markPaidLoanCommand = new Command("mark-paid")
  .description("Mark the next pending loan installment as paid")
  .argument("<id>", "Loan ID")
  .option("--currency <code>", "Payment currency")
  .option("--account-id <id>", "Account ID")
  .option("--notes <notes>", "Payment notes")
  .option("--paid-at <date>", "Payment date (YYYY-MM-DD)")
  .option("--verified", "Re-read the loan after paying and verify server state")
  .addHelpText(
    "after",
    "\nExample:\n  lucas loans mark-paid <id> --verified\n" +
      "\nAn accepted payment always exits 0. Read data.verification.verified:\n" +
      "true (checked), false (server state looks wrong), null (check failed).\n",
  )
  .action(runMarkPaidLoan);
