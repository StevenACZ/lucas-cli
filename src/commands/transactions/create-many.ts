import { readFileSync } from "fs";
import { Command } from "commander";
import { apiRequest } from "../../lib/api-client.js";
import { parseDateOption } from "../../lib/dates.js";
import { accountsAfterWrite } from "../../lib/effects.js";
import { CliError, invalidValue } from "../../lib/errors.js";
import { parseAmount } from "../../lib/number-parser.js";
import { output } from "../../lib/output.js";
import { resolveAccount, resolveCategory } from "../../lib/resolve.js";
import { accountRef, transactionView } from "../../lib/views.js";

type Row = Record<string, unknown>;

export const BULK_PATH = "/api/transactions/bulk";
export const BULK_MAX = 50;
const DAY = /^\d{4}-\d{2}-\d{2}$/;

interface PlannedItem {
  index: number;
  account: Row;
  item: Row;
}

function text(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

async function planItem(raw: unknown, index: number): Promise<PlannedItem> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw invalidValue("Each item must be an object");
  }
  const input = raw as Row;
  if (input.notes !== undefined) {
    throw invalidValue(
      "notes is not supported by bulk create; add them afterwards with lucas transactions update",
    );
  }
  const accountInput = text(input.account) ?? text(input.accountId);
  if (!accountInput) throw invalidValue("account is required (name or id)");
  const type = String(input.type ?? "")
    .trim()
    .toUpperCase();
  if (type !== "INCOME" && type !== "EXPENSE") {
    throw invalidValue("type must be INCOME or EXPENSE", { value: input.type });
  }
  const description = text(input.description);
  if (!description) throw invalidValue("description is required");
  const amount = parseAmount(input.amount, "amount");
  const date = parseDateOption(
    input.date === undefined ? "today" : String(input.date),
    "date",
  );
  if (!date || !DAY.test(date)) {
    throw invalidValue("date must be a day: today, yesterday or YYYY-MM-DD", {
      value: input.date,
    });
  }
  const account = await resolveAccount(accountInput);
  const categoryInput = text(input.category) ?? text(input.categoryId);
  const category = categoryInput
    ? await resolveCategory(categoryInput, type)
    : undefined;
  return {
    index,
    account,
    item: {
      date,
      amount,
      type,
      description,
      ...(category && { categoryId: category.id }),
    },
  };
}

export async function planBulk(items: unknown): Promise<PlannedItem[]> {
  if (!Array.isArray(items) || items.length === 0) {
    throw invalidValue("The file must hold a non-empty JSON array of items");
  }
  const errors: Row[] = [];
  const planned: PlannedItem[] = [];
  for (const [index, raw] of items.entries()) {
    try {
      planned.push(await planItem(raw, index));
    } catch (error) {
      if (!(error instanceof CliError)) throw error;
      errors.push({ index, code: error.code, message: error.message });
    }
  }
  if (errors.length > 0) {
    throw invalidValue(
      `${errors.length} of ${items.length} items are invalid; nothing was created`,
      { errors },
    );
  }
  return planned;
}

export function bulkRequests(
  planned: PlannedItem[],
): Array<{ accountId: string; indexes: number[]; body: Row }> {
  const byAccount = new Map<string, PlannedItem[]>();
  for (const entry of planned) {
    const id = String(entry.account.id);
    byAccount.set(id, [...(byAccount.get(id) ?? []), entry]);
  }
  return [...byAccount.entries()].flatMap(([accountId, entries]) => {
    const chunks: PlannedItem[][] = [];
    for (let start = 0; start < entries.length; start += BULK_MAX) {
      chunks.push(entries.slice(start, start + BULK_MAX));
    }
    return chunks.map((chunk) => ({
      accountId,
      indexes: chunk.map((entry) => entry.index),
      body: { accountId, items: chunk.map((entry) => entry.item) },
    }));
  });
}

function readInput(file: string): unknown {
  let content: string;
  try {
    content = readFileSync(file === "-" ? 0 : file, "utf8");
  } catch {
    throw invalidValue(`Cannot read --file ${file}`);
  }
  try {
    return JSON.parse(content);
  } catch {
    throw invalidValue(`--file ${file} is not valid JSON`);
  }
}

export const createManyTransactionsCommand = new Command("create-many")
  .description(
    "Create many incomes/expenses from a JSON array (validates all first, skips duplicates)",
  )
  .requiredOption(
    "--file <path|->",
    "JSON file with an array of items, - for stdin",
  )
  .option(
    "--dry-run",
    "Resolve and validate, print the requests, write nothing",
  )
  .addHelpText(
    "after",
    `
Item fields: account (name or id), type (INCOME|EXPENSE), amount (positive, up
to 2 decimals), description, category (name, slug or id, optional), date
(today, yesterday or YYYY-MM-DD, default today). notes is not supported.

Items are grouped per account and sent ${BULK_MAX} per request. Existing movements
with the same day, type, amount and description are skipped, not duplicated.

Examples:
  lucas transactions create-many --file expenses.json --dry-run
  echo '[{"account":"Soles","type":"EXPENSE","amount":12.5,"description":"Taxi"}]' \\
    | lucas transactions create-many --file -
`,
  )
  .action(async (opts: { file: string; dryRun?: boolean }) => {
    const planned = await planBulk(readInput(opts.file));
    const requests = bulkRequests(planned);
    const accounts = [
      ...new Map(planned.map((entry) => [entry.account.id, entry.account])),
    ].map(([, account]) => accountRef(account));

    if (opts.dryRun) {
      output.success({
        dryRun: true,
        requests: requests.map(({ body }) => ({
          method: "POST",
          path: BULK_PATH,
          body,
        })),
        items: planned.length,
        accounts,
      });
      return;
    }

    const created: Row[] = [];
    const skipped: Row[] = [];
    for (const request of requests) {
      const response = await apiRequest<Row>("POST", BULK_PATH, request.body);
      created.push(
        ...((response.created as Row[] | undefined) ?? []).map(transactionView),
      );
      for (const entry of (response.skipped as Row[] | undefined) ?? []) {
        skipped.push({
          ...entry,
          index: request.indexes[Number(entry.index)],
        });
      }
    }
    output.success({
      created,
      skipped,
      accounts: await accountsAfterWrite([
        ...new Set(requests.map((r) => r.accountId)),
      ]),
    });
  });
