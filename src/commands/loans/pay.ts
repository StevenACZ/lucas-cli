import { Command, Option } from "commander";
import { apiRequest, apiRequestOrThrow } from "../../lib/api-client.js";
import { findNextPayableInstallment } from "../../lib/loan-domain.js";
import type { LoanDetails } from "../../lib/types.js";
import {
  loanVerificationUnavailable,
  verifyLoanPayment,
  type LoanVerificationOutcome,
} from "../../lib/loan-verification.js";
import {
  parseFiniteNumber,
  parseOptionalNumber,
} from "../../lib/number-parser.js";
import { accountsAfterWrite } from "../../lib/effects.js";
import { output } from "../../lib/output.js";
import { resolveAccountId, resolveLoanId } from "../../lib/resolve.js";
import { resourcePath } from "../../lib/resource-path.js";
import { stripHeavy } from "../../lib/views.js";

export interface PayLoanOptions {
  amount: number | string;
  currency?: string;
  loanAmount?: number | string;
  exchangeRate?: number | string;
  account?: string;
  accountId?: string;
  notes?: string;
  paidAt?: string;
  verified?: boolean;
  dryRun?: boolean;
}

export interface PayLoanExecutionResult {
  payment: unknown;
  loan?: LoanDetails;
  verification?: LoanVerificationOutcome;
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
  const loanPath = resourcePath("/api/loans", id);
  const query = opts.paidAt ? { paymentDate: opts.paidAt } : undefined;
  const beforeLoan = opts.verified
    ? await apiRequest<LoanDetails>("GET", loanPath, undefined, query)
    : undefined;
  const payment = await apiRequest<{
    paymentId?: string;
    loan?: LoanDetails;
  }>("POST", resourcePath("/api/loans", id, "pay"), body);
  if (!beforeLoan) return { payment };
  let afterLoan: LoanDetails;
  try {
    afterLoan = await apiRequestOrThrow<LoanDetails>(
      "GET",
      loanPath,
      undefined,
      query,
    );
  } catch {
    // The payment is already persisted; a failed re-read must never be
    // reported as a failed payment or the caller retries a non-idempotent POST.
    return { payment, verification: loanVerificationUnavailable() };
  }
  const targetInstallment = findNextPayableInstallment(beforeLoan);
  const recordedPayment = payment.paymentId
    ? (afterLoan.payments?.find((item) => item.id === payment.paymentId) ??
      payment.loan?.payments?.find((item) => item.id === payment.paymentId))
    : undefined;
  const expectedLoanReduction = recordedPayment?.loanAmount;
  if (
    typeof expectedLoanReduction !== "number" ||
    !Number.isFinite(expectedLoanReduction) ||
    expectedLoanReduction <= 0
  ) {
    return {
      payment,
      loan: afterLoan,
      verification: loanVerificationUnavailable(),
    };
  }
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

export async function runPayLoan(ref: string, opts: PayLoanOptions) {
  const id = await resolveLoanId(ref);
  const accountId = await resolveAccountId(opts.account ?? opts.accountId);
  const resolved = { ...opts, accountId };
  if (opts.dryRun) {
    output.success({
      dryRun: true,
      request: {
        method: "POST",
        path: resourcePath("/api/loans", id, "pay"),
        body: buildPayLoanPayload(resolved),
      },
    });
    return;
  }
  const result = await executePayLoan(id, resolved);
  output.success({
    ...stripHeavy(result),
    accounts: await accountsAfterWrite([accountId]),
  });
}

export const payLoanCommand = new Command("pay")
  .description("Make a loan payment")
  .argument("<loan>", "Loan name or id")
  .requiredOption("--amount <amount>", "Amount paid, in the payment currency")
  .option("--currency <code>", "Payment currency (default: the loan currency)")
  .option(
    "--loan-amount <amount>",
    "Amount credited in the loan currency (cross-currency payments)",
  )
  .option("--exchange-rate <rate>", "Exchange rate payment→loan currency")
  .option(
    "--account <name|id>",
    "Paying account name or id (omit to record without debiting an account)",
  )
  .addOption(new Option("--account-id <id>").hideHelp())
  .option("--notes <notes>", "Payment notes")
  .option("--paid-at <date>", "Payment day (YYYY-MM-DD)")
  .option("--verified", "Re-read the loan after paying and verify server state")
  .option("--dry-run", "Resolve and validate, print the request, write nothing")
  .addHelpText(
    "after",
    "\nExamples:\n  lucas loans pay <id> --amount 750 --account Soles --verified\n" +
      "  lucas loans pay <id> --amount 750 --account Soles --dry-run\n" +
      "\nAn accepted payment always exits 0. Read data.verification.verified:\n" +
      "true (checked), false (server state looks wrong), null (check failed).\n",
  )
  .action(runPayLoan);
