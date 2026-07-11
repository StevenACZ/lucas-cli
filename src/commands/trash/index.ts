import { Command } from "commander";
import { apiRequest } from "../../lib/api-client.js";
import { compactParams } from "../../lib/query-params.js";
import { output } from "../../lib/output.js";
import { resourcePath } from "../../lib/resource-path.js";

export const trashCommand = new Command("trash").description(
  "Inspect and recover soft-deleted transactions and transfers",
);

trashCommand
  .command("summary")
  .description("Count-only trash summary across all recoverable entities")
  .action(async () => {
    const data = await apiRequest("GET", "/api/trash/summary");
    output.success(data);
  });

trashCommand
  .command("transactions")
  .description("List soft-deleted transactions (not part of a transfer)")
  .option("--limit <n>", "Items per page (1..100)")
  .option("--offset <n>", "Pagination offset")
  .action(async (opts: { limit?: string; offset?: string }) => {
    const data = await apiRequest(
      "GET",
      "/api/transactions/trash",
      undefined,
      compactParams({ limit: opts.limit, offset: opts.offset }),
    );
    output.success(data);
  });

trashCommand
  .command("transfers")
  .description("List soft-deleted transfers with both legs")
  .action(async () => {
    const data = await apiRequest("GET", "/api/transfers/trash");
    output.success(data);
  });

trashCommand
  .command("restore-transaction")
  .description("Restore a soft-deleted transaction")
  .argument("<id>", "Transaction ID")
  .action(async (id: string) => {
    const data = await apiRequest(
      "POST",
      resourcePath("/api/transactions", id, "restore"),
    );
    output.success(data);
  });

trashCommand
  .command("restore-transfer")
  .description("Restore a soft-deleted transfer (re-applies balance effects)")
  .argument("<id>", "Transfer ID")
  .action(async (id: string) => {
    const data = await apiRequest(
      "POST",
      resourcePath("/api/transfers", id, "restore"),
    );
    output.success(data);
  });

trashCommand
  .command("permanent-delete-transaction")
  .description("Permanently delete a trashed transaction (irreversible)")
  .argument("<id>", "Transaction ID")
  .action(async (id: string) => {
    const data = await apiRequest(
      "DELETE",
      resourcePath("/api/transactions", id, "permanent"),
    );
    output.success(data);
  });

trashCommand
  .command("permanent-delete-transfer")
  .description("Permanently delete a trashed transfer (irreversible)")
  .argument("<id>", "Transfer ID")
  .action(async (id: string) => {
    const data = await apiRequest(
      "DELETE",
      resourcePath("/api/transfers", id, "permanent"),
    );
    output.success(data);
  });

trashCommand
  .command("empty-transactions")
  .description("Permanently delete every trashed transaction (irreversible)")
  .action(async () => {
    const data = await apiRequest("DELETE", "/api/transactions/trash");
    output.success(data);
  });

trashCommand
  .command("empty-transfers")
  .description("Permanently delete every trashed transfer (irreversible)")
  .action(async () => {
    const data = await apiRequest("DELETE", "/api/transfers/trash");
    output.success(data);
  });
