import { apiRequest } from "./api-client.js";
import { invalidValue } from "./errors.js";
import { extractItems } from "./types.js";

type Row = Record<string, unknown>;

export const MAX_PAGE_SIZE = 100;

export function parseLimit(value: unknown, fallback: number): number {
  if (value === undefined) return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > MAX_PAGE_SIZE) {
    throw invalidValue(
      `--limit must be an integer between 1 and ${MAX_PAGE_SIZE}`,
      {
        value,
        hint: "Use --all to fetch every page",
      },
    );
  }
  return parsed;
}

export function parseOffset(value: unknown): number {
  if (value === undefined) return 0;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw invalidValue("--offset must be a non-negative integer", { value });
  }
  return parsed;
}

async function getRows(
  path: string,
  params: Record<string, string>,
  limit: number,
  offset: number,
): Promise<Row[]> {
  const response = await apiRequest<unknown>("GET", path, undefined, {
    ...params,
    limit: String(limit),
    offset: String(offset),
  });
  return extractItems<Row>(response, ["items", "transactions", "data"]) ?? [];
}

export async function fetchPage(
  path: string,
  params: Record<string, string>,
  limit: number,
  offset: number,
): Promise<{ rows: Row[]; hasMore: boolean }> {
  if (limit < MAX_PAGE_SIZE) {
    const rows = await getRows(path, params, limit + 1, offset);
    return { rows: rows.slice(0, limit), hasMore: rows.length > limit };
  }
  const rows = await getRows(path, params, limit, offset);
  if (rows.length < limit) return { rows, hasMore: false };
  const probe = await getRows(path, params, 1, offset + limit);
  return { rows, hasMore: probe.length > 0 };
}

export async function fetchAll(
  path: string,
  params: Record<string, string>,
  max: number,
): Promise<{ rows: Row[]; truncated: boolean }> {
  const rows: Row[] = [];
  for (let offset = 0; rows.length < max; offset += MAX_PAGE_SIZE) {
    const page = await getRows(path, params, MAX_PAGE_SIZE, offset);
    rows.push(...page);
    if (page.length < MAX_PAGE_SIZE)
      return { rows: rows.slice(0, max), truncated: false };
  }
  return { rows: rows.slice(0, max), truncated: true };
}
