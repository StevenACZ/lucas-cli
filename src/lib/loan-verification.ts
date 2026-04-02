import {
  getInstallmentRemaining,
  getLoanRemaining,
  type LoanDetailsLike,
} from "./loan-domain.js";

export interface LoanVerificationResult {
  verified: boolean;
  checkedAt: string;
  expectedLoanReduction?: number;
  actualLoanReduction: number;
  targetInstallmentId?: string;
  staleInstallmentIds: string[];
  reason?: string;
}

export function verifyLoanPayment(params: {
  beforeLoan: LoanDetailsLike;
  afterLoan: LoanDetailsLike;
  expectedLoanReduction?: number;
  targetInstallmentId?: string;
}): LoanVerificationResult {
  const actualLoanReduction =
    getLoanRemaining(params.beforeLoan) - getLoanRemaining(params.afterLoan);
  const staleInstallmentIds = params.afterLoan.installments
    .filter((item) => getInstallmentRemaining(item) <= 0.01)
    .filter((item) => !["PAID", "CANCELED"].includes(item.status))
    .map((item) => item.id ?? `sequence-${item.sequence ?? "unknown"}`);
  if (
    params.expectedLoanReduction !== undefined &&
    actualLoanReduction + 0.01 < params.expectedLoanReduction
  ) {
    return {
      verified: false,
      checkedAt: new Date().toISOString(),
      expectedLoanReduction: params.expectedLoanReduction,
      actualLoanReduction,
      targetInstallmentId: params.targetInstallmentId,
      staleInstallmentIds,
      reason: "remaining_balance_did_not_drop_as_expected",
    };
  }
  if (staleInstallmentIds.length > 0) {
    return {
      verified: false,
      checkedAt: new Date().toISOString(),
      expectedLoanReduction: params.expectedLoanReduction,
      actualLoanReduction,
      targetInstallmentId: params.targetInstallmentId,
      staleInstallmentIds,
      reason: "fully_paid_installment_still_not_marked_paid",
    };
  }
  return {
    verified: true,
    checkedAt: new Date().toISOString(),
    expectedLoanReduction: params.expectedLoanReduction,
    actualLoanReduction,
    targetInstallmentId: params.targetInstallmentId,
    staleInstallmentIds,
  };
}
