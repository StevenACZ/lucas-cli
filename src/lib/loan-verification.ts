import {
  getInstallmentRemaining,
  getLoanLateFees,
  getLoanRemaining,
} from "./loan-domain.js";
import type { LoanDetails } from "./types.js";

export interface LoanVerificationResult {
  verified: boolean;
  checkedAt: string;
  expectedLoanReduction?: number;
  actualLoanReduction: number;
  lateFeesAdded: number;
  targetInstallmentId?: string;
  staleInstallmentIds: string[];
  reason?: string;
}

export interface LoanVerificationUnavailable {
  verified: null;
  checkedAt: string;
  reason: string;
}

export type LoanVerificationOutcome =
  LoanVerificationResult | LoanVerificationUnavailable;

export function loanVerificationUnavailable(): LoanVerificationUnavailable {
  return {
    verified: null,
    checkedAt: new Date().toISOString(),
    reason: "verification_unavailable",
  };
}

export function verifyLoanPayment(params: {
  beforeLoan: LoanDetails;
  afterLoan: LoanDetails;
  expectedLoanReduction?: number;
  targetInstallmentId?: string;
}): LoanVerificationResult {
  const actualLoanReduction =
    getLoanRemaining(params.beforeLoan) - getLoanRemaining(params.afterLoan);
  // The server can materialise a late fee inside the same payment, which raises
  // the remaining balance by that fee; it is not a missing payment.
  const lateFeesAdded = Math.max(
    0,
    getLoanLateFees(params.afterLoan) - getLoanLateFees(params.beforeLoan),
  );
  const staleInstallmentIds = params.afterLoan.installments
    .filter((item) => getInstallmentRemaining(item) <= 0.01)
    .filter((item) => !["PAID", "CANCELED"].includes(item.status))
    .map((item) => item.id ?? `sequence-${item.sequence ?? "unknown"}`);
  const base = {
    checkedAt: new Date().toISOString(),
    expectedLoanReduction: params.expectedLoanReduction,
    actualLoanReduction,
    lateFeesAdded,
    targetInstallmentId: params.targetInstallmentId,
    staleInstallmentIds,
  };
  if (
    params.expectedLoanReduction !== undefined &&
    actualLoanReduction + lateFeesAdded + 0.01 < params.expectedLoanReduction
  ) {
    return {
      verified: false,
      ...base,
      reason: "remaining_balance_did_not_drop_as_expected",
    };
  }
  if (staleInstallmentIds.length > 0) {
    return {
      verified: false,
      ...base,
      reason: "fully_paid_installment_still_not_marked_paid",
    };
  }
  return { verified: true, ...base };
}
