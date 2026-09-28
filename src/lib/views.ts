// Compact, stable shapes for the resources agents read most. `--full` on a
// command skips these projections but still drops heavy blobs.
import { formatLocalDateTime } from "./dates.js";

type Row = Record<string, unknown>;

const HEAVY_KEY = /(Base64|^ocrRawResponse)$/;

export function stripHeavy<T>(value: T): T {
  if (Array.isArray(value)) return value.map(stripHeavy) as T;
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value as Row)
      .filter(([key]) => !HEAVY_KEY.test(key))
      .map(([key, entry]) => [key, stripHeavy(entry)]),
  ) as T;
}

export function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function compact(row: Row): Row {
  return Object.fromEntries(
    Object.entries(row).filter(([, value]) => value !== undefined),
  );
}

function asRow(value: unknown): Row | undefined {
  return value && typeof value === "object" ? (value as Row) : undefined;
}

export function availableCredit(account: Row): number | undefined {
  if (account.type !== "CREDIT") return undefined;
  const limit = toNumber(account.creditLimit);
  if (limit === null) return undefined;
  const debt = toNumber(account.currentDebt) ?? 0;
  return Math.max(0, Math.round((limit - debt) * 100) / 100);
}

export function accountView(account: Row): Row {
  const isCredit = account.type === "CREDIT";
  return compact({
    id: account.id,
    name: account.name,
    bank: account.bank,
    type: account.type,
    currency: account.currency,
    balance: toNumber(account.balance),
    ...(isCredit && {
      currentDebt: toNumber(account.currentDebt),
      creditLimit: toNumber(account.creditLimit),
      availableCredit: availableCredit(account),
      statementClosingDay: account.statementClosingDay ?? null,
    }),
    ...(account.cashbackEnabled === true && {
      cashbackRate: toNumber(account.cashbackRate),
    }),
    vault: account.vault === true,
    excluded: account.excluded === true,
    archived: account.isArchived === true,
  });
}

export function accountRef(account: Row | undefined): Row | null {
  if (!account) return null;
  return compact({
    id: account.id,
    name: account.name,
    currency: account.currency,
  });
}

export function transactionView(transaction: Row): Row {
  const account = asRow(transaction.account);
  const category = asRow(transaction.category);
  return compact({
    id: transaction.id,
    date: transaction.date,
    localDate: formatLocalDateTime(transaction.date),
    type: transaction.type,
    amount: toNumber(transaction.amount),
    currency: account?.currency,
    description: transaction.description,
    account: account
      ? accountRef(account)
      : transaction.accountId
        ? { id: transaction.accountId }
        : null,
    category: category ? { id: category.id, name: category.name } : null,
    notes: transaction.notes ?? undefined,
    transferId: transaction.transferId ?? undefined,
    subscriptionChargeId: transaction.subscriptionChargeId ?? undefined,
    loanPaymentId: transaction.loanPaymentId ?? undefined,
    needsConfirmation: transaction.needsConfirmation === true || undefined,
  });
}

function legDirection(leg: Row, transfer: Row): string | undefined {
  const direction = asRow(leg.ocrRawResponse)?.direction;
  if (direction === "OUT" || direction === "IN") return direction;
  if (leg.accountId && leg.accountId === transfer.fromAccountId) return "OUT";
  if (leg.accountId && leg.accountId === transfer.toAccountId) return "IN";
  return undefined;
}

function side(account: unknown, leg: Row | undefined, id: unknown): Row | null {
  return (
    accountRef(asRow(account)) ??
    accountRef(asRow(leg?.account)) ??
    ((id ?? leg?.accountId) ? { id: id ?? leg?.accountId } : null)
  );
}

export function transferView(transfer: Row, legs: Row[] = []): Row {
  const out = legs.find((leg) => legDirection(leg, transfer) === "OUT");
  const incoming = legs.find((leg) => legDirection(leg, transfer) === "IN");
  const amount = toNumber(transfer.amount ?? out?.amount);
  const date = transfer.date ?? out?.date ?? incoming?.date;
  return compact({
    id: transfer.id ?? out?.transferId ?? incoming?.transferId,
    date,
    localDate: formatLocalDateTime(date),
    amount,
    toAmount: toNumber(transfer.toAmount ?? incoming?.amount) ?? amount,
    exchangeRate: toNumber(
      transfer.exchangeRate ?? out?.exchangeRate ?? incoming?.exchangeRate,
    ),
    description: transfer.description ?? out?.description ?? null,
    notes: transfer.notes ?? out?.notes ?? incoming?.notes ?? null,
    from: side(transfer.fromAccount, out, transfer.fromAccountId),
    to: side(transfer.toAccount, incoming, transfer.toAccountId),
  });
}

export function categoryView(category: Row): Row {
  return compact({
    id: category.id,
    name: category.name,
    type: category.type,
    slug: category.slug,
    custom: category.isDefault !== true,
  });
}
