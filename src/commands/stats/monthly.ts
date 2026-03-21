import { Command } from "commander";
import { apiRequest } from "../../lib/api-client.js";
import { output } from "../../lib/output.js";

export const monthlyCommand = new Command("monthly")
  .description("Get monthly statistics")
  .action(async () => {
    const data = await apiRequest("GET", "/api/stats/monthly");
    output.success(data);
  });
