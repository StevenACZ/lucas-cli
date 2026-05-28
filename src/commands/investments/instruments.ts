import { Command } from "commander";
import { apiRequest } from "../../lib/api-client.js";
import { output } from "../../lib/output.js";
import { resourcePath } from "../../lib/resource-path.js";

interface InstrumentListOptions {
  limit?: string;
  offset?: string;
  rank?: string;
  type?: string;
  exchange?: string;
  inactive?: boolean;
}

interface InstrumentSearchOptions {
  limit?: string;
}

export function buildInstrumentListParams(
  opts: InstrumentListOptions,
): Record<string, string> | undefined {
  const params: Record<string, string> = {};
  if (opts.limit) params.limit = opts.limit;
  if (opts.offset) params.offset = opts.offset;
  if (opts.rank) params.rank = opts.rank;
  if (opts.type) params.type = opts.type;
  if (opts.exchange) params.exchange = opts.exchange;
  if (opts.inactive) params.isActive = "false";
  return Object.keys(params).length > 0 ? params : undefined;
}

export function buildInstrumentSearchParams(
  query: string,
  opts: InstrumentSearchOptions,
): Record<string, string> {
  return {
    q: query,
    ...(opts.limit && { limit: opts.limit }),
  };
}

export const listInstrumentsCommand = new Command("instruments")
  .description("List investment instruments")
  .option("--limit <n>", "Items per page (1..200)")
  .option("--offset <n>", "Pagination offset")
  .option("--rank <rank>", "Ranking filter (popular)")
  .option("--type <type>", "Instrument type (STOCK|ETF|CRYPTO|BOND)")
  .option("--exchange <exchange>", "Exchange code")
  .option("--inactive", "Include inactive instruments only")
  .action(async (opts: InstrumentListOptions) => {
    const data = await apiRequest(
      "GET",
      "/api/investments/instruments",
      undefined,
      buildInstrumentListParams(opts),
    );
    output.success(data);
  });

export const searchInstrumentsCommand = new Command("search")
  .description("Search investment instruments")
  .argument("<query>", "Search text, ticker, or provider symbol")
  .option("--limit <n>", "Max results (1..50)")
  .action(async (query: string, opts: InstrumentSearchOptions) => {
    const data = await apiRequest(
      "GET",
      "/api/investments/instruments/search",
      undefined,
      buildInstrumentSearchParams(query, opts),
    );
    output.success(data);
  });

export const getInstrumentCommand = new Command("instrument")
  .description("Get investment instrument detail")
  .argument("<id>", "Instrument ID")
  .action(async (id: string) => {
    const data = await apiRequest(
      "GET",
      resourcePath("/api/investments/instruments", id),
    );
    output.success(data);
  });
