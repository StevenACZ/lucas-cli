// Accounts and categories can be referenced by id or by name everywhere.
// Resolution is exact first, then a unique partial match; anything else is a
// structured NOT_FOUND / AMBIGUOUS error listing the candidates.
import { apiRequest } from "./api-client.js";
import { CliError, invalidValue } from "./errors.js";
import { extractItems } from "./types.js";
import { accountView, categoryView } from "./views.js";

type Row = Record<string, unknown>;

const ID_SHAPE =
  /^(c[a-z0-9]{20,32}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;

export function normalizeName(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[\s_-]+/g, " ")
    .trim();
}

let accountsCache: Promise<Row[]> | undefined;
let categoriesCache: Promise<Row[]> | undefined;

export function resetResolverCache(): void {
  accountsCache = undefined;
  categoriesCache = undefined;
}

export function loadAccounts(): Promise<Row[]> {
  accountsCache ??= apiRequest<unknown>("GET", "/api/accounts").then(
    (response) => extractItems<Row>(response, ["accounts", "items"]) ?? [],
  );
  return accountsCache;
}

export function loadCategories(): Promise<Row[]> {
  categoriesCache ??= apiRequest<unknown>("GET", "/api/categories").then(
    (response) => extractItems<Row>(response, ["categories", "items"]) ?? [],
  );
  return categoriesCache;
}

async function pick<T extends Row>(
  kind: "account" | "category",
  ref: string,
  rows: T[],
  keys: (row: T) => string[],
  view: (row: T) => Row,
  sameNameTieBreak?: (matches: T[]) => Promise<T>,
): Promise<T> {
  const wanted = normalizeName(ref);
  if (!wanted) throw invalidValue(`Empty ${kind} reference`);
  const byId = rows.find((row) => row.id === ref.trim());
  if (byId) return byId;

  const exact = rows.filter((row) => keys(row).some((key) => key === wanted));
  const matches =
    exact.length > 0
      ? exact
      : rows.filter((row) =>
          keys(row)
            .slice(0, 2)
            .some((key) => key.includes(wanted)),
        );

  if (matches.length === 1) return matches[0];
  const sameName =
    matches.length > 1 &&
    new Set(matches.map((row) => normalizeName(row.name))).size === 1;
  if (sameName && sameNameTieBreak) return sameNameTieBreak(matches);
  if (matches.length > 1) {
    throw new CliError({
      code: "AMBIGUOUS",
      message: `"${ref}" matches ${matches.length} ${kind === "account" ? "accounts" : "categories"}`,
      hint: `Use the exact name or the id`,
      details: { candidates: matches.map(view) },
    });
  }
  if (ID_SHAPE.test(ref.trim())) return { id: ref.trim() } as unknown as T;
  throw new CliError({
    code: "NOT_FOUND",
    message: `No ${kind} matches "${ref}"`,
    hint:
      kind === "account"
        ? "Run: lucas accounts list"
        : "Run: lucas categories list",
    details: { available: rows.map((row) => row.name) },
  });
}

export async function resolveAccount(ref: string): Promise<Row> {
  const accounts = await loadAccounts();
  return pick(
    "account",
    ref,
    accounts,
    (account) => [
      normalizeName(account.name),
      normalizeName(`${account.bank} ${account.name}`),
    ],
    accountView,
  );
}

export async function resolveAccountId(
  ref: string | undefined,
): Promise<string | undefined> {
  if (ref === undefined) return undefined;
  return String((await resolveAccount(ref)).id);
}

function pickCategory(
  all: Row[],
  ref: string,
  type: string | undefined,
  sameNameTieBreak: (matches: Row[]) => Promise<Row>,
): Promise<Row> {
  const wantedType = type?.toUpperCase();
  const typed =
    wantedType === "INCOME" || wantedType === "EXPENSE"
      ? all.filter((category) => category.type === wantedType)
      : all;
  return pick(
    "category",
    ref,
    typed.length > 0 ? typed : all,
    (category) => [
      normalizeName(category.name),
      normalizeName(category.slug),
      ...(Array.isArray(category.aliases)
        ? category.aliases.map(normalizeName)
        : []),
    ],
    categoryView,
    sameNameTieBreak,
  );
}

export async function resolveCategory(
  ref: string,
  type?: string,
): Promise<Row> {
  return pickCategory(await loadCategories(), ref, type, mostRecentlyUsed);
}

// Filters keep every same-name copy so no movement is left out.
export async function resolveCategoryFilterIds(
  ref: string,
  type?: string,
): Promise<string> {
  const match = await pickCategory(
    await loadCategories(),
    ref,
    type,
    async (matches) => ({ id: matches.map((row) => row.id).join(",") }),
  );
  return String(match.id);
}

// Default and custom copies of the same category ("Food", "Salary") are
// common; pick the one the user's movements used last, else the default.
async function mostRecentlyUsed(candidates: Row[]): Promise<Row> {
  const lastUse = await Promise.all(
    candidates.map(async (category) => {
      const rows = await apiRequest<unknown>(
        "GET",
        "/api/transactions",
        undefined,
        { categoryIds: String(category.id), limit: "1" },
      );
      const latest = (extractItems<Row>(rows, ["items"]) ?? [])[0];
      return latest ? Date.parse(String(latest.date)) || 0 : -1;
    }),
  );
  const best = Math.max(...lastUse);
  if (best < 0) {
    return candidates.find((category) => category.isDefault) ?? candidates[0];
  }
  return candidates[lastUse.indexOf(best)];
}

export async function resolveCategoryId(
  ref: string | undefined,
  type?: string,
): Promise<string | undefined> {
  if (ref === undefined) return undefined;
  return String((await resolveCategory(ref, type)).id);
}
