import { Command } from "commander";
import { apiRequest } from "../../lib/api-client.js";
import { output } from "../../lib/output.js";

export const summaryCommand = new Command("summary")
  .description("Get financial summary")
  .action(async () => {
    const data = await apiRequest("GET", "/api/stats/summary");
    output.success(data);
  });
