import { Command } from "commander";
import { apiRequest } from "../../lib/api-client.js";
import { output } from "../../lib/output.js";
import { resourcePath } from "../../lib/resource-path.js";

export const deleteTransferCommand = new Command("delete")
  .description("Delete a transfer")
  .argument("<id>", "Transfer ID")
  .action(async (id: string) => {
    const data = await apiRequest("DELETE", resourcePath("/api/transfers", id));
    output.success(data);
  });
