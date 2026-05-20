import { Command } from "commander";
import { apiRequest } from "../../lib/api-client.js";
import { output } from "../../lib/output.js";

interface TransferListOptions {
  limit?: string;
  offset?: string;
}

export function buildTransferListParams(
  opts: TransferListOptions,
): Record<string, string> | undefined {
  const params: Record<string, string> = {};
  if (opts.limit) params.limit = opts.limit;
  if (opts.offset) params.offset = opts.offset;
  return Object.keys(params).length > 0 ? params : undefined;
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
