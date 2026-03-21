import { Command } from "commander";
import { apiRequest } from "../../lib/api-client.js";
import { output } from "../../lib/output.js";

export const deleteTransactionCommand = new Command("delete")
  .description("Delete a transaction")
  .argument("<id>", "Transaction ID")
  .action(async (id: string) => {
    const data = await apiRequest("DELETE", `/api/transactions/${id}`);
    output.success(data);
  });
