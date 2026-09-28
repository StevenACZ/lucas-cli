import { Command } from "commander";
import { apiRequest } from "../../lib/api-client.js";
import { output } from "../../lib/output.js";
import { MAX_PAGE_SIZE, parseLimit, parseOffset } from "../../lib/paging.js";
import { extractItems } from "../../lib/types.js";
import { transferView } from "../../lib/views.js";

type Row = Record<string, unknown>;

const DEFAULT_LIMIT = 20;

export function groupTransferLegs(legs: Row[]): Row[] {
  const groups = new Map<string, Row[]>();
  for (const leg of legs) {
    const id = String(leg.transferId ?? leg.id);
    groups.set(id, [...(groups.get(id) ?? []), leg]);
  }
  return [...groups.entries()].map(([id, pair]) =>
    transferView(
      {
        id,
        fromAccountId: pair[0].fromAccountId,
        toAccountId: pair[0].toAccountId,
        fromAccount: pair[0].fromAccount,
        toAccount: pair[0].toAccount,
      },
      pair,
    ),
  );
}

async function fetchTransfers(limit: number, offset: number): Promise<Row[]> {
  const response = await apiRequest<unknown>(
    "GET",
    "/api/transfers",
    undefined,
    {
      limit: String(limit),
      offset: String(offset),
    },
  );
  return groupTransferLegs(extractItems<Row>(response, ["items"]) ?? []);
}

export async function fetchTransferPage(
  limit: number,
  offset: number,
): Promise<{ rows: Row[]; hasMore: boolean }> {
  if (limit < MAX_PAGE_SIZE) {
    const rows = await fetchTransfers(limit + 1, offset);
    return { rows: rows.slice(0, limit), hasMore: rows.length > limit };
  }
  const rows = await fetchTransfers(limit, offset);
  if (rows.length < limit) return { rows, hasMore: false };
  const probe = await fetchTransfers(1, offset + limit);
  return { rows, hasMore: probe.length > 0 };
}

export const listTransfersCommand = new Command("list")
  .description("List transfers between your accounts, newest first")
  .option(
    "--limit <n>",
    `Transfers per page, 1..100 (default ${DEFAULT_LIMIT})`,
  )
  .option("--offset <n>", "Transfers to skip")
  .addHelpText(
    "after",
    `
Output: data is an array of transfers {id, date, localDate, amount, toAmount,
exchangeRate, description, notes, from, to}; meta has count, limit, offset and
hasMore.
`,
  )
  .action(async (opts: { limit?: string; offset?: string }) => {
    const limit = parseLimit(opts.limit, DEFAULT_LIMIT);
    const offset = parseOffset(opts.offset);
    const { rows, hasMore } = await fetchTransferPage(limit, offset);
    output.success(rows, { count: rows.length, limit, offset, hasMore });
  });
