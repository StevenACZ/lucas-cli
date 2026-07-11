import type { LoanDetails, LoanInstallment } from "./types.js";

export function getInstallmentRemaining(installment: LoanInstallment): number {
  return Math.max(
    0,
    installment.dueAmount +
      (installment.lateFeeAdded ?? 0) -
      installment.paidAmount,
  );
}

export function getLoanRemaining(loan: LoanDetails): number {
  return loan.installments.reduce(
    (total, installment) => total + getInstallmentRemaining(installment),
    0,
  );
}

export function findNextPayableInstallment(loan: LoanDetails) {
  return [...loan.installments]
    .filter((item) => !["PAID", "CANCELED"].includes(item.status))
    .filter((item) => getInstallmentRemaining(item) > 0.01)
    .sort((left, right) => {
      const dueDateDiff = left.dueDate.localeCompare(right.dueDate);
      if (dueDateDiff !== 0) return dueDateDiff;
      return (
        (left.sequence ?? Number.MAX_SAFE_INTEGER) -
        (right.sequence ?? Number.MAX_SAFE_INTEGER)
      );
    })[0];
}
