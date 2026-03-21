import { Command } from "commander";
import { apiRequest } from "../../lib/api-client.js";
import { output } from "../../lib/output.js";

export const listTransfersCommand = new Command("list")
  .description("List all transfers")
  .action(async () => {
    const data = await apiRequest("GET", "/api/transfers");
    output.success(data);
  });
