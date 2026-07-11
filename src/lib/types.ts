// Shared backend resource shapes. The CLI is a thin pass-through client, so
// these types only pin the fields the CLI actually reads; everything else
// stays an open index signature.

export interface Account {
  id?: string;
  type?: string;
  creditLimit?: number | null;
  currentDebt?: number | null;
  [key: string]: unknown;
}

export interface AccountsSummary {
  accounts?: Account[];
  [key: string]: unknown;
}

export interface LoanPayment {
  id: string;
  paidAt: string;
  payAmount: number;
  loanAmount: number;
  payCurrency: string;
  [key: string]: unknown;
}

export interface LoanInstallment {
  id?: string;
  sequence?: number;
  dueDate: string;
  dueAmount: number;
  paidAmount: number;
  lateFeeAdded?: number | null;
  status: string;
}

export interface LoanDetails {
  id?: string;
  currency?: string;
  installments: LoanInstallment[];
  payments?: LoanPayment[];
}

export interface Subscription {
  id: string;
  lastBilling?: string | null;
  nextBilling?: string | null;
  isActive?: boolean;
}

export interface SubscriptionCharge {
  subscriptionId: string;
  dueDate: string;
  paidAt?: string | null;
  status: string;
}

// List endpoints have historically answered either a bare array or a wrapper
// object; extract the items without per-command shape sniffing.
export function extractItems<T>(
  response: unknown,
  wrapperKeys: string[] = ["items"],
): T[] | null {
  if (Array.isArray(response)) return response as T[];
  if (response && typeof response === "object") {
    for (const key of wrapperKeys) {
      const value = (response as Record<string, unknown>)[key];
      if (Array.isArray(value)) return value as T[];
    }
  }
  return null;
}
