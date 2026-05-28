import { Command } from "commander";
import { apiRequest } from "../../lib/api-client.js";
import { output } from "../../lib/output.js";

interface InvestmentRefreshOptions {
  action: string;
  exchanges?: string;
  country?: string;
}

export function buildInvestmentRefreshParams(
  opts: InvestmentRefreshOptions,
): Record<string, string> {
  return {
    action: opts.action,
    ...(opts.exchanges && { exchanges: opts.exchanges }),
    ...(opts.country && { country: opts.country }),
  };
}

export const refreshInvestmentsCommand = new Command("refresh")
  .description("Run a backend investment refresh job")
  .requiredOption("--action <action>", "Refresh action (catalog|eod|snapshot)")
  .option("--exchanges <codes>", "Catalog exchanges, comma-separated")
  .option("--country <country>", "Catalog country filter")
  .action(async (opts: InvestmentRefreshOptions) => {
    const data = await apiRequest(
      "POST",
      "/api/investments/quotes/refresh",
      undefined,
      buildInvestmentRefreshParams(opts),
    );
    output.success(data);
  });
