import { Command } from "commander";
import { apiRequest } from "../../lib/api-client.js";
import { output } from "../../lib/output.js";

export const byCategoryCommand = new Command("by-category")
  .description("Get statistics by category")
  .action(async () => {
    const data = await apiRequest("GET", "/api/stats/by-category");
    output.success(data);
  });
