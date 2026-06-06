import { readFile, stat } from "fs/promises";
import { Command } from "commander";
import { apiRequest } from "../../lib/api-client.js";
import { output } from "../../lib/output.js";
import { resourcePath } from "../../lib/resource-path.js";

interface ImportOptions {
  file: string;
  source?: string;
  importBatchId?: string;
  instrumentMap?: string[];
  apply?: boolean;
  dryRun?: boolean;
}

interface HapiJson {
  transactions?: Array<Record<string, unknown>>;
  v6_execution_log?: Array<Record<string, unknown>>;
  tax_lots?: Array<Record<string, unknown>>;
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

function parseInstrumentMap(values: string[] | undefined): Map<string, string> {
  const map = new Map<string, string>();
  for (const value of values ?? []) {
    const [symbolRaw, instrumentIdRaw] = value.split("=");
    const symbol = symbolRaw?.trim().toUpperCase();
    const instrumentId = instrumentIdRaw?.trim();
    if (!symbol || !instrumentId) {
      output.error("--instrument-map must use SYMBOL=instrumentId", 400);
    }
    map.set(symbol, instrumentId);
  }
  return map;
}

function instrumentReference(
  ticker: string,
  instrumentMap: Map<string, string>,
): { instrumentId: string } | { symbol: string } {
  const instrumentId = instrumentMap.get(ticker.toUpperCase());
  return instrumentId ? { instrumentId } : { symbol: ticker };
}

function closedLotQuantities(data: HapiJson): Map<string, number> {
  const quantities = new Map<string, number>();
  for (const row of data.tax_lots ?? []) {
    const ticker = asString(row.ticker);
    const saleDate = asString(row.sale_date);
    const quantity = asNumber(row.qty_sold);
    if (!ticker || !saleDate || !quantity) continue;
    const key = `${saleDate}:${ticker.toUpperCase()}`;
    quantities.set(key, (quantities.get(key) ?? 0) + quantity);
  }
  return quantities;
}

export function buildHapiImportPayload(
  data: HapiJson,
  opts: ImportOptions,
): Record<string, unknown> {
  const source = opts.source ?? "hapi-json";
  const instrumentMap = parseInstrumentMap(opts.instrumentMap);
  const lotQuantities = closedLotQuantities(data);
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
      ...instrumentReference(ticker, instrumentMap),
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
      ...instrumentReference(ticker, instrumentMap),
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
    const executionQuantity = asNumber(row.quantity);
    const executionPrice = asNumber(row.execution_price);
    const date = asString(row.trade_date);
    if (!ticker || !executionQuantity || !executionPrice || !date) continue;
    const lotQuantity = lotQuantities.get(`${date}:${ticker.toUpperCase()}`);
    const quantity = lotQuantity ?? executionQuantity;
    const grossAmount = asNumber(row.gross_amount);
    const price =
      lotQuantity && grossAmount ? grossAmount / lotQuantity : executionPrice;
    const fee =
      (asNumber(row.clearing_fee) ?? 0) + (asNumber(row.regulatory_fees) ?? 0);
    trades.push({
      externalId: `sell:${date}:${asString(row.trade_time) ?? "00:00"}:${ticker}`,
      ...instrumentReference(ticker, instrumentMap),
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
  .option(
    "--instrument-map <symbol=id>",
    "Resolve an ambiguous ticker with an explicit backend instrument ID",
    (value, previous: string[]) => [...previous, value],
    [],
  )
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
