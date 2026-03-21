import { Command } from "commander";
import { apiRequest } from "../../lib/api-client.js";
import { output } from "../../lib/output.js";

export const deleteTransferCommand = new Command("delete")
  .description("Delete a transfer")
  .argument("<id>", "Transfer ID")
  .action(async (id: string) => {
    const data = await apiRequest("DELETE", `/api/transfers/${id}`);
    output.success(data);
  });
