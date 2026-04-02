import { Command } from "commander";
import { apiRequest } from "../../lib/api-client.js";
import {
  findNextPayableInstallment,
  type LoanDetailsLike,
} from "../../lib/loan-domain.js";
import {
  verifyLoanPayment,
  type LoanVerificationResult,
} from "../../lib/loan-verification.js";
import {
  parseFiniteNumber,
  parseOptionalNumber,
} from "../../lib/number-parser.js";
import { output } from "../../lib/output.js";

export interface PayLoanOptions {
  amount: number | string;
  currency?: string;
  loanAmount?: number | string;
  exchangeRate?: number | string;
  accountId?: string;
  notes?: string;
  paidAt?: string;
  verified?: boolean;
}

export interface PayLoanExecutionResult {
  payment: unknown;
  loan?: LoanDetailsLike;
  verification?: LoanVerificationResult;
}

export function buildPayLoanPayload(opts: PayLoanOptions) {
  const body: Record<string, unknown> = {
    payAmount: parseFiniteNumber(opts.amount, "--amount"),
  };
  const loanAmount = parseOptionalNumber(opts.loanAmount, "--loan-amount");
  const exchangeRate = parseOptionalNumber(
    opts.exchangeRate,
    "--exchange-rate",
  );
  if (opts.currency) body.payCurrency = opts.currency;
  if (loanAmount !== undefined) body.loanAmount = loanAmount;
  if (exchangeRate !== undefined) body.exchangeRate = exchangeRate;
  if (opts.accountId) body.accountId = opts.accountId;
  if (opts.notes) body.notes = opts.notes;
  if (opts.paidAt) body.paidAt = opts.paidAt;
  return body;
}

export async function executePayLoan(
  id: string,
  opts: PayLoanOptions,
): Promise<PayLoanExecutionResult> {
  const body = buildPayLoanPayload(opts);
  const beforeLoan = opts.verified
    ? await apiRequest<LoanDetailsLike>("GET", `/api/loans/${id}`)
    : undefined;
  const payment = await apiRequest("POST", `/api/loans/${id}/pay`, body);
  if (!beforeLoan) return { payment };
  const afterLoan = await apiRequest<LoanDetailsLike>(
    "GET",
    `/api/loans/${id}`,
  );
  const targetInstallment = findNextPayableInstallment(beforeLoan);
  const expectedLoanReduction =
    typeof body.loanAmount === "number"
      ? body.loanAmount
      : !body.payCurrency || body.payCurrency === beforeLoan.currency
        ? (body.payAmount as number)
        : undefined;
  return {
    payment,
    loan: afterLoan,
    verification: verifyLoanPayment({
      beforeLoan,
      afterLoan,
      expectedLoanReduction,
      targetInstallmentId: targetInstallment?.id,
    }),
  };
}

export async function runPayLoan(id: string, opts: PayLoanOptions) {
  const result = await executePayLoan(id, opts);
  if (result.verification && !result.verification.verified) {
    output.error("Server state verification failed after payment", 409, result);
  }
  output.success(result.verification ? result : result.payment);
}

export const payLoanCommand = new Command("pay")
  .description("Make a loan payment")
  .argument("<id>", "Loan ID")
  .requiredOption("--amount <amount>", "Payment amount")
  .option("--currency <code>", "Payment currency")
  .option("--loan-amount <amount>", "Loan currency amount")
  .option("--exchange-rate <rate>", "Exchange rate")
  .option("--account-id <id>", "Account ID")
  .option("--notes <notes>", "Payment notes")
  .option("--paid-at <date>", "Payment date (YYYY-MM-DD)")
  .option("--verified", "Re-read the loan after paying and verify server state")
  .addHelpText(
    "after",
    "\nExample:\n  lucas loans pay <id> --amount 750 --verified\n",
  )
  .action(runPayLoan);
