import { Command } from "commander";
import { apiRequest } from "../../lib/api-client.js";
import { output } from "../../lib/output.js";
import { resourcePath } from "../../lib/resource-path.js";

interface ArchivedItemsOptions {
  limit?: string;
  offset?: string;
  kind?: string;
}

export function buildArchivedItemsParams(
  opts: ArchivedItemsOptions,
): Record<string, string> | undefined {
  const params: Record<string, string> = {};
  if (opts.limit) params.limit = opts.limit;
  if (opts.offset) params.offset = opts.offset;
  if (opts.kind) params.kind = opts.kind;
  return Object.keys(params).length > 0 ? params : undefined;
}

export const listArchivedInvestmentsCommand = new Command("archived")
  .description("List archived investment accounts summary")
  .action(async () => {
    const data = await apiRequest("GET", "/api/investments/archived");
    output.success(data);
  });

export const listArchivedInvestmentItemsCommand = new Command("archived-items")
  .description("List archived investment trades and cash adjustments")
  .option("--limit <n>", "Items per page (1..100)")
  .option("--offset <n>", "Pagination offset")
  .option("--kind <kind>", "Item kind (all|trade|cash-adjustment)")
  .action(async (opts: ArchivedItemsOptions) => {
    const data = await apiRequest(
      "GET",
      "/api/investments/archived/items",
      undefined,
      buildArchivedItemsParams(opts),
    );
    output.success(data);
  });

export const restoreArchivedInvestmentsCommand = new Command("restore-archived")
  .description("Restore all archived investments for an account")
  .argument("<account-id>", "Investment account ID")
  .action(async (accountId: string) => {
    const data = await apiRequest(
      "POST",
      resourcePath("/api/investments/archived", accountId, "restore"),
    );
    output.success(data);
  });

export const restoreTradeCommand = new Command("trade-restore")
  .description("Restore an archived investment trade")
  .argument("<trade-id>", "Trade ID")
  .action(async (tradeId: string) => {
    const data = await apiRequest(
      "POST",
      resourcePath("/api/investments/trades", tradeId, "restore"),
    );
    output.success(data);
  });

export const restoreCashAdjustmentCommand = new Command("cash-restore")
  .description("Restore an archived investment cash adjustment")
  .argument("<adjustment-id>", "Cash adjustment ID")
  .action(async (adjustmentId: string) => {
    const data = await apiRequest(
      "POST",
      resourcePath(
        "/api/investments/cash-adjustments",
        adjustmentId,
        "restore",
      ),
    );
    output.success(data);
  });

export const permanentDeleteTradeCommand = new Command("trade-permanent-delete")
  .description("Permanently delete an archived investment trade")
  .argument("<trade-id>", "Trade ID")
  .action(async (tradeId: string) => {
    const data = await apiRequest(
      "DELETE",
      resourcePath("/api/investments/trades", tradeId, "permanent"),
    );
    output.success(data);
  });

export const permanentDeleteCashAdjustmentCommand = new Command(
  "cash-permanent-delete",
)
  .description("Permanently delete an archived investment cash adjustment")
  .argument("<adjustment-id>", "Cash adjustment ID")
  .action(async (adjustmentId: string) => {
    const data = await apiRequest(
      "DELETE",
      resourcePath(
        "/api/investments/cash-adjustments",
        adjustmentId,
        "permanent",
      ),
    );
    output.success(data);
  });

export const emptyArchivedInvestmentsCommand = new Command("archived-empty")
  .description("Permanently delete all archived investment items")
  .action(async () => {
    const data = await apiRequest("DELETE", "/api/investments/archived");
    output.success(data);
  });
