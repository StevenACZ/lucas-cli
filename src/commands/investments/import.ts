import { readFile, stat } from "fs/promises";
import { Command } from "commander";
import { apiRequest } from "../../lib/api-client.js";
import { output } from "../../lib/output.js";
import { resourcePath } from "../../lib/resource-path.js";

interface ImportOptions {
  file: string;
  source?: string;
  importBatchId?: string;
  apply?: boolean;
  dryRun?: boolean;
}

interface HapiJson {
  transactions?: Array<Record<string, unknown>>;
  v6_execution_log?: Array<Record<string, unknown>>;
  monthly_log?: Array<Record<string, unknown>>;
  income_taxes?: Array<Record<string, unknown>>;
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function asNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

function dayToIso(value: unknown): string {
  const day = asString(value);
  if (!day) return new Date().toISOString();
  return `${day}T12:00:00.000Z`;
}

export function buildHapiImportPayload(
  data: HapiJson,
  opts: ImportOptions,
): Record<string, unknown> {
  const source = opts.source ?? "hapi-json";
  const trades: Array<Record<string, unknown>> = [];
  const cashAdjustments: Array<Record<string, unknown>> = [];

  for (const row of data.monthly_log ?? []) {
    const amount = asNumber(row.deposit_received);
    const month = asString(row.month);
    if (!amount || !month) continue;
    cashAdjustments.push({
      externalId: `deposit:${month}`,
      amount,
      occurredAt: dayToIso(month),
      type: "DEPOSIT",
      note: asString(row.notes) ?? `Monthly deposit ${month}`,
    });
  }

  for (const row of data.income_taxes ?? []) {
    const amount = asNumber(row.net_amount) ?? asNumber(row.gross_amount);
    const ticker = asString(row.ticker);
    const date = asString(row.event_date);
    if (!amount || !ticker || !date) continue;
    cashAdjustments.push({
      externalId: `dividend:${date}:${ticker}`,
      amount,
      symbol: ticker,
      occurredAt: dayToIso(date),
      type: "DIVIDEND",
      note: asString(row.notes) ?? `${ticker} dividend`,
    });
  }

  for (const row of data.transactions ?? []) {
    const ticker = asString(row.ticker);
    const quantity = asNumber(row.quantity);
    const price = asNumber(row.price_per_share);
    const fee = asNumber(row.fee) ?? 0;
    const date = asString(row.trade_date);
    const externalId = asString(row.tax_lot_id);
    if (!ticker || !quantity || !price || !date || !externalId) continue;
    trades.push({
      externalId,
      symbol: ticker,
      side: "BUY",
      quantity,
      price,
      fee,
      executedAt: dayToIso(date),
      notes: asString(row.notes),
    });
  }

  for (const row of data.v6_execution_log ?? []) {
    if (asString(row.action)?.toUpperCase() !== "SELL") continue;
    const ticker = asString(row.ticker);
    const quantity = asNumber(row.quantity);
    const price = asNumber(row.execution_price);
    const date = asString(row.trade_date);
    if (!ticker || !quantity || !price || !date) continue;
    const fee =
      (asNumber(row.clearing_fee) ?? 0) + (asNumber(row.regulatory_fees) ?? 0);
    trades.push({
      externalId: `sell:${date}:${asString(row.trade_time) ?? "00:00"}:${ticker}`,
      symbol: ticker,
      side: "SELL",
      quantity,
      price,
      fee,
      executedAt: dayToIso(date),
      notes: asString(row.notes),
    });
  }

  return {
    source,
    dryRun: opts.apply ? false : opts.dryRun !== false,
    ...(opts.importBatchId && { importBatchId: opts.importBatchId }),
    trades,
    cashAdjustments,
  };
}

export const importInvestmentsCommand = new Command("import")
  .description("Import normalized investment activity from a supported file")
  .argument("<account-id>", "Investment account ID")
  .requiredOption("--file <path>", "Source JSON file")
  .option("--source <source>", "Import source key", "hapi-json")
  .option("--import-batch-id <id>", "Import batch identifier")
  .option("--apply", "Apply the import. Defaults to dry-run.")
  .option("--dry-run", "Validate without writing")
  .action(async (accountId: string, opts: ImportOptions) => {
    const info = await stat(opts.file).catch(() => null);
    if (!info || !info.isFile()) {
      output.error("--file must point to a readable JSON file", 400);
    }
    const json = JSON.parse(await readFile(opts.file, "utf8")) as HapiJson;
    const body = buildHapiImportPayload(json, opts);
    const data = await apiRequest(
      "POST",
      resourcePath("/api/investments/accounts", accountId, "import"),
      body,
    );
    output.success(data);
  });
