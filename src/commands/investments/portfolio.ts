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

interface BackfillOptions {
  range: string;
  quoteMode?: string;
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

export const investmentReportCommand = new Command("report")
  .description("Get an agent-friendly investment account report")
  .argument("<account-id>", "Investment account ID")
  .option("--range <range>", "History range (7d|30d|90d|1y|ytd)", "30d")
  .option("--activity-limit <n>", "Activity items to include", "20")
  .action(
    async (
      accountId: string,
      opts: HistoryOptions & { activityLimit?: string },
    ) => {
      const [overview, positions, activity, history] = await Promise.all([
        apiRequest(
          "GET",
          resourcePath("/api/investments/accounts", accountId, "overview"),
        ),
        apiRequest(
          "GET",
          resourcePath("/api/investments/accounts", accountId, "positions"),
        ),
        apiRequest(
          "GET",
          resourcePath("/api/investments/accounts", accountId, "activity"),
          undefined,
          { limit: opts.activityLimit ?? "20", offset: "0", kind: "all" },
        ),
        apiRequest(
          "GET",
          resourcePath("/api/investments/accounts", accountId, "history"),
          undefined,
          buildInvestmentHistoryParams({ range: opts.range }),
        ),
      ]);
      output.success({ overview, positions, activity, history });
    },
  );

export function buildInvestmentHistoryBackfillBody(
  opts: BackfillOptions,
): Record<string, unknown> {
  return {
    range: opts.range,
    ...(opts.quoteMode && { quoteMode: opts.quoteMode }),
  };
}

export const investmentHistoryBackfillCommand = new Command("history-backfill")
  .description("Rebuild cached investment account history")
  .argument("<account-id>", "Investment account ID")
  .requiredOption("--range <range>", "Backfill range (ytd|1y|5y)")
  .option("--quote-mode <mode>", "Quote mode (missing|refresh)")
  .action(async (accountId: string, opts: BackfillOptions) => {
    const data = await apiRequest(
      "POST",
      resourcePath(
        "/api/investments/accounts",
        accountId,
        "history",
        "backfill",
      ),
      buildInvestmentHistoryBackfillBody(opts),
    );
    output.success(data);
  });
