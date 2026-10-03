import { Command } from "commander";
import { apiRequest } from "../../lib/api-client.js";
import { invalidValue } from "../../lib/errors.js";
import { output } from "../../lib/output.js";
import { fetchPage, parseOffset } from "../../lib/paging.js";
import { extractItems, type AccountsSummary } from "../../lib/types.js";
import { accountView, stripHeavy } from "../../lib/views.js";

type Row = Record<string, unknown>;

const ARCHIVED_PATH = "/api/accounts/archived";
const ARCHIVED_MAX_LIMIT = 50;

function parseArchivedLimit(value: unknown): number {
  if (value === undefined) return ARCHIVED_MAX_LIMIT;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > ARCHIVED_MAX_LIMIT) {
    throw invalidValue(
      `--limit must be an integer between 1 and ${ARCHIVED_MAX_LIMIT}`,
      { value },
    );
  }
  return parsed;
}

async function fetchArchivedPage(
  limit: number,
  offset: number,
): Promise<{ rows: Row[]; hasMore: boolean }> {
  if (limit < ARCHIVED_MAX_LIMIT) {
    return fetchPage(ARCHIVED_PATH, {}, limit, offset);
  }
  const rows =
    extractItems<Row>(
      await apiRequest<unknown>("GET", ARCHIVED_PATH, undefined, {
        limit: String(limit),
        offset: String(offset),
      }),
      ["accounts", "items"],
    ) ?? [];
  if (rows.length < limit) return { rows, hasMore: false };
  const probe = await fetchPage(ARCHIVED_PATH, {}, 1, offset + limit);
  return { rows, hasMore: probe.rows.length > 0 };
}

export function accountsListPayload(
  summary: AccountsSummary,
  archived: Row[],
  full = false,
): { data: Row[]; meta: Row } {
  const rows = [
    ...(extractItems<Row>(summary, ["accounts", "items"]) ?? []),
    ...archived,
  ];
  return {
    data: rows.map((row) => (full ? stripHeavy(row) : accountView(row))),
    meta: {
      count: rows.length,
      balancesByCurrency: summary.balancesByCurrency ?? {},
      debtByCurrency: summary.debtByCurrency ?? {},
    },
  };
}

export const listAccountsCommand = new Command("list")
  .description("List accounts with balances (CREDIT rows add availableCredit)")
  .option("--include-archived", "Append archived accounts")
  .option(
    "--limit <n>",
    "Archived accounts page size, 1..50 (with --include-archived)",
  )
  .option("--offset <n>", "Archived accounts to skip (with --include-archived)")
  .option("--full", "Print the raw backend objects")
  .addHelpText(
    "after",
    `
Output: data is an array of accounts; meta has count, balancesByCurrency and
debtByCurrency (active accounts only); --include-archived adds meta.archived
with count, limit, offset and hasMore for the archived page. availableCredit = max(0, creditLimit -
currentDebt); an overpaid card (negative currentDebt) raises it above the limit.

Examples:
  lucas accounts list
  lucas accounts list --include-archived
  lucas accounts list --include-archived --limit 20 --offset 20
`,
  )
  .action(
    async (opts: {
      includeArchived?: boolean;
      limit?: string;
      offset?: string;
      full?: boolean;
    }) => {
      if (!opts.includeArchived) {
        if (opts.limit !== undefined || opts.offset !== undefined) {
          throw invalidValue(
            "--limit and --offset page the archived accounts",
            { hint: "Add --include-archived" },
          );
        }
        const summary = await apiRequest<AccountsSummary>(
          "GET",
          "/api/accounts",
        );
        const { data, meta } = accountsListPayload(summary, [], opts.full);
        output.success(data, meta);
        return;
      }
      const limit = parseArchivedLimit(opts.limit);
      const offset = parseOffset(opts.offset);
      const summary = await apiRequest<AccountsSummary>("GET", "/api/accounts");
      const { rows, hasMore } = await fetchArchivedPage(limit, offset);
      const { data, meta } = accountsListPayload(summary, rows, opts.full);
      output.success(data, {
        ...meta,
        archived: { count: rows.length, limit, offset, hasMore },
      });
    },
  );
