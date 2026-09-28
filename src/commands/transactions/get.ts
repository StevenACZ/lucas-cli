import { Command } from "commander";
import { apiRequest } from "../../lib/api-client.js";
import { output } from "../../lib/output.js";
import { resourcePath } from "../../lib/resource-path.js";
import { stripHeavy, transactionView } from "../../lib/views.js";

export const getTransactionCommand = new Command("get")
  .description("Get a single transaction by id")
  .argument("<id>", "Transaction id")
  .option("--full", "Print the raw backend object")
  .action(async (id: string, opts: { full?: boolean }) => {
    const transaction = await apiRequest<Record<string, unknown>>(
      "GET",
      resourcePath("/api/transactions", id),
    );
    output.success(
      opts.full ? stripHeavy(transaction) : transactionView(transaction),
    );
  });
