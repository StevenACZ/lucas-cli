import { Command, Option } from "commander";
import {
  findNextPayableInstallment,
  getInstallmentRemaining,
} from "../../lib/loan-domain.js";
import type { LoanDetails, LoanInstallment } from "../../lib/types.js";
import { output } from "../../lib/output.js";
import {
  executePayLoan,
  type PayLoanExecutionResult,
  type PayLoanOptions,
} from "./pay.js";
import { apiRequest } from "../../lib/api-client.js";
import { accountsAfterWrite } from "../../lib/effects.js";
import { invalidValue } from "../../lib/errors.js";
import { resolveAccountId } from "../../lib/resolve.js";
import { resourcePath } from "../../lib/resource-path.js";
import { stripHeavy } from "../../lib/views.js";

export interface MarkPaidLoanOptions {
  currency?: string;
  account?: string;
  accountId?: string;
  notes?: string;
  paidAt?: string;
  verified?: boolean;
}

function summarizeSettlement(installment: LoanInstallment | undefined) {
  if (!installment) return undefined;
  const remainingAfter = getInstallmentRemaining(installment);
  return {
    remainingAfter,
    fullyPaid: remainingAfter <= 0.01 && installment.status === "PAID",
  };
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
    throw invalidValue("No pending installment found for this loan", {
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
  const afterInstallment = result.loan?.installments.find((item) =>
    installment.id !== undefined
      ? item.id === installment.id
      : installment.sequence !== undefined &&
        item.sequence === installment.sequence,
  );
  return {
    ...result,
    loanId: id,
    markedInstallment: {
      id: installment.id,
      sequence: installment.sequence,
      dueDate: installment.dueDate,
      remainingAmount: payOpts.amount,
      ...summarizeSettlement(afterInstallment),
    },
  };
}

export async function runMarkPaidLoan(id: string, opts: MarkPaidLoanOptions) {
  const accountId = await resolveAccountId(opts.account ?? opts.accountId);
  const result = await executeMarkPaidLoan(id, { ...opts, accountId });
  output.success({
    ...stripHeavy(result),
    accounts: await accountsAfterWrite([accountId]),
  });
}

export const markPaidLoanCommand = new Command("mark-paid")
  .description("Mark the next pending loan installment as paid")
  .argument("<id>", "Loan ID")
  .option("--currency <code>", "Payment currency")
  .option("--account <name|id>", "Paying account name or id")
  .addOption(new Option("--account-id <id>").hideHelp())
  .option("--notes <notes>", "Payment notes")
  .option("--paid-at <date>", "Payment day (YYYY-MM-DD)")
  .option("--verified", "Re-read the loan after paying and verify server state")
  .addHelpText(
    "after",
    "\nExample:\n  lucas loans mark-paid <id> --verified\n" +
      "\nAn accepted payment always exits 0. Read data.verification.verified:\n" +
      "true (checked), false (server state looks wrong), null (check failed).\n" +
      "\nRead data.markedInstallment.fullyPaid too: false means the installment\n" +
      "still owes data.markedInstallment.remainingAfter, e.g. because the server\n" +
      "added a late fee while applying this payment.\n",
  )
  .action(runMarkPaidLoan);
