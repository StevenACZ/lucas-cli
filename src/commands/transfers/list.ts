import { Command } from "commander";
import { apiRequest } from "../../lib/api-client.js";
import { compactParams } from "../../lib/query-params.js";
import { output } from "../../lib/output.js";

interface TransferListOptions {
  limit?: string;
  offset?: string;
}

export function buildTransferListParams(
  opts: TransferListOptions,
): Record<string, string> | undefined {
  return compactParams({ limit: opts.limit, offset: opts.offset });
}

export const listTransfersCommand = new Command("list")
  .description("List all transfers")
  .option("--limit <n>", "Transfer pairs per page")
  .option("--offset <n>", "Transfer pair pagination offset")
  .action(async (opts: TransferListOptions) => {
    const data = await apiRequest(
      "GET",
      "/api/transfers",
      undefined,
      buildTransferListParams(opts),
    );
    output.success(data);
  });
