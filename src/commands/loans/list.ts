import { Command } from "commander";
import { apiRequest } from "../../lib/api-client.js";
import { output } from "../../lib/output.js";

export const listLoansCommand = new Command("list")
  .description("List all loans")
  .action(async () => {
    const data = await apiRequest("GET", "/api/loans");
    output.success(data);
  });
