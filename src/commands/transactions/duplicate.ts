import { Command } from "commander";
import { apiRequest } from "../../lib/api-client.js";
import { output } from "../../lib/output.js";
import { resourcePath } from "../../lib/resource-path.js";

export const duplicateTransactionCommand = new Command("duplicate")
  .description("Duplicate a transaction")
  .argument("<id>", "Transaction ID")
  .action(async (id: string) => {
    const data = await apiRequest(
      "POST",
      resourcePath("/api/transactions", id, "duplicate"),
    );
    output.success(data);
  });
