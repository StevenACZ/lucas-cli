export interface LoanInstallmentLike {
  id?: string;
  sequence?: number;
  dueDate: string;
  dueAmount: number;
  paidAmount: number;
  lateFeeAdded?: number | null;
  status: string;
}

export interface LoanDetailsLike {
  id?: string;
  currency?: string;
  installments: LoanInstallmentLike[];
}

export function getInstallmentRemaining(
  installment: LoanInstallmentLike,
): number {
  return Math.max(
    0,
    installment.dueAmount +
      (installment.lateFeeAdded ?? 0) -
      installment.paidAmount,
  );
}

export function getLoanRemaining(loan: LoanDetailsLike): number {
  return loan.installments.reduce(
    (total, installment) => total + getInstallmentRemaining(installment),
    0,
  );
}

export function findNextPayableInstallment(loan: LoanDetailsLike) {
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
