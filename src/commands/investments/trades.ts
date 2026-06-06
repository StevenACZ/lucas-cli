import { Command } from "commander";
import { apiRequest } from "../../lib/api-client.js";
import { buildBody } from "../../lib/body-builder.js";
import { parseFiniteNumber } from "../../lib/number-parser.js";
import { output } from "../../lib/output.js";
import { resourcePath } from "../../lib/resource-path.js";

interface CreateTradeOptions {
  instrumentId?: string;
  symbol?: string;
  side: string;
  quantity: string;
  price: string;
  fee?: string;
  executedAt?: string;
  notes?: string;
}

interface UpdateTradeOptions {
  side?: string;
  quantity?: string;
  price?: string;
  fee?: string;
  executedAt?: string;
  notes?: string;
  clearNotes?: boolean;
}

export function buildCreateTradeBody(
  opts: CreateTradeOptions,
): Record<string, unknown> {
  return {
    ...(opts.instrumentId && { instrumentId: opts.instrumentId }),
    ...(opts.symbol && { symbol: opts.symbol }),
    side: opts.side.toUpperCase(),
    quantity: parseFiniteNumber(opts.quantity, "--quantity"),
    price: parseFiniteNumber(opts.price, "--price"),
    fee: opts.fee === undefined ? 0 : parseFiniteNumber(opts.fee, "--fee"),
    executedAt: opts.executedAt ?? new Date().toISOString(),
    ...(opts.notes && { notes: opts.notes }),
  };
}

export function buildUpdateTradeBody(
  opts: UpdateTradeOptions,
): Record<string, unknown> {
  return buildBody(opts as Record<string, unknown>, [
    { opt: "side", body: "side" },
    { opt: "quantity", body: "quantity", type: "number" },
    { opt: "price", body: "price", type: "number" },
    { opt: "fee", body: "fee", type: "number" },
    { opt: "executedAt", body: "executedAt" },
    { opt: "notes", body: "notes", clearOpt: "clearNotes" },
  ]);
}

export const createTradeCommand = new Command("trade")
  .description("Create an investment trade")
  .argument("<account-id>", "Investment account ID")
  .option("--instrument-id <id>", "Investment instrument ID")
  .option("--symbol <symbol>", "Investment ticker symbol")
  .requiredOption("--side <side>", "Trade side (BUY|SELL)")
  .requiredOption("--quantity <quantity>", "Trade quantity")
  .requiredOption("--price <price>", "Execution price")
  .option("--fee <fee>", "Trade fee", "0")
  .option("--executed-at <iso>", "Execution datetime (ISO 8601)")
  .option("--notes <notes>", "Trade notes")
  .action(async (accountId: string, opts: CreateTradeOptions) => {
    const data = await apiRequest(
      "POST",
      resourcePath("/api/investments/accounts", accountId, "trades"),
      buildCreateTradeBody(opts),
    );
    output.success(data);
  });

function buildSymbolTradeCommand(name: string, side: "BUY" | "SELL") {
  return new Command(name)
    .description(`${side === "BUY" ? "Buy" : "Sell"} an investment`)
    .argument("<account-id>", "Investment account ID")
    .option("--instrument-id <id>", "Investment instrument ID")
    .option("--symbol <symbol>", "Investment ticker symbol")
    .requiredOption("--quantity <quantity>", "Trade quantity")
    .requiredOption("--price <price>", "Execution price")
    .option("--fee <fee>", "Trade fee", "0")
    .option("--executed-at <iso>", "Execution datetime (ISO 8601)")
    .option("--notes <notes>", "Trade notes")
    .action(
      async (accountId: string, opts: Omit<CreateTradeOptions, "side">) => {
        if (Boolean(opts.instrumentId) === Boolean(opts.symbol)) {
          output.error("Send exactly one of --instrument-id or --symbol", 400);
        }
        const data = await apiRequest(
          "POST",
          resourcePath("/api/investments/accounts", accountId, "trades"),
          buildCreateTradeBody({ ...opts, side }),
        );
        output.success(data);
      },
    );
}

export const buyTradeCommand = buildSymbolTradeCommand("buy", "BUY");
export const sellTradeCommand = buildSymbolTradeCommand("sell", "SELL");

export const updateTradeCommand = new Command("trade-update")
  .description("Update an investment trade")
  .argument("<trade-id>", "Trade ID")
  .option("--side <side>", "Trade side (BUY|SELL)")
  .option("--quantity <quantity>", "Trade quantity")
  .option("--price <price>", "Execution price")
  .option("--fee <fee>", "Trade fee")
  .option("--executed-at <iso>", "Execution datetime (ISO 8601)")
  .option("--notes <notes>", "Trade notes")
  .option("--clear-notes", "Clear trade notes")
  .action(async (tradeId: string, opts: UpdateTradeOptions) => {
    const data = await apiRequest(
      "PUT",
      resourcePath("/api/investments/trades", tradeId),
      buildUpdateTradeBody(opts),
    );
    output.success(data);
  });

export const deleteTradeCommand = new Command("trade-delete")
  .description("Delete an investment trade")
  .argument("<trade-id>", "Trade ID")
  .action(async (tradeId: string) => {
    const data = await apiRequest(
      "DELETE",
      resourcePath("/api/investments/trades", tradeId),
    );
    output.success(data);
  });
