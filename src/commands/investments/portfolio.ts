import { Command } from "commander";
import { apiRequest } from "../../lib/api-client.js";
import { output } from "../../lib/output.js";
import { resourcePath } from "../../lib/resource-path.js";

interface ActivityOptions {
  limit?: string;
  offset?: string;
  kind?: string;
}

interface HistoryOptions {
  range?: string;
}

export function buildInvestmentActivityParams(
  opts: ActivityOptions,
): Record<string, string> | undefined {
  const params: Record<string, string> = {};
  if (opts.limit) params.limit = opts.limit;
  if (opts.offset) params.offset = opts.offset;
  if (opts.kind) params.kind = opts.kind;
  return Object.keys(params).length > 0 ? params : undefined;
}

export function buildInvestmentHistoryParams(
  opts: HistoryOptions,
): Record<string, string> | undefined {
  return opts.range ? { range: opts.range } : undefined;
}

export const investmentOverviewCommand = new Command("overview")
  .description("Get investment account overview")
  .argument("<account-id>", "Investment account ID")
  .action(async (accountId: string) => {
    const data = await apiRequest(
      "GET",
      resourcePath("/api/investments/accounts", accountId, "overview"),
    );
    output.success(data);
  });

export const investmentPositionsCommand = new Command("positions")
  .description("List positions for an investment account")
  .argument("<account-id>", "Investment account ID")
  .action(async (accountId: string) => {
    const data = await apiRequest(
      "GET",
      resourcePath("/api/investments/accounts", accountId, "positions"),
    );
    output.success(data);
  });

export const investmentActivityCommand = new Command("activity")
  .description("List investment account activity")
  .argument("<account-id>", "Investment account ID")
  .option("--limit <n>", "Items per page (1..100)")
  .option("--offset <n>", "Pagination offset")
  .option("--kind <kind>", "Activity kind (trades|adjustments|transfers|all)")
  .action(async (accountId: string, opts: ActivityOptions) => {
    const data = await apiRequest(
      "GET",
      resourcePath("/api/investments/accounts", accountId, "activity"),
      undefined,
      buildInvestmentActivityParams(opts),
    );
    output.success(data);
  });

export const investmentHistoryCommand = new Command("history")
  .description("List investment account history points")
  .argument("<account-id>", "Investment account ID")
  .option("--range <range>", "History range (7d|30d|90d|1y|ytd)")
  .action(async (accountId: string, opts: HistoryOptions) => {
    const data = await apiRequest(
      "GET",
      resourcePath("/api/investments/accounts", accountId, "history"),
      undefined,
      buildInvestmentHistoryParams(opts),
    );
    output.success(data);
  });
