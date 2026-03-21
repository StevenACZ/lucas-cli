import { Command } from "commander";
import { apiRequest } from "../../lib/api-client.js";
import { output } from "../../lib/output.js";

export const deleteLoanCommand = new Command("delete")
  .description("Delete a loan")
  .argument("<id>", "Loan ID")
  .action(async (id: string) => {
    const data = await apiRequest("DELETE", `/api/loans/${id}`);
    output.success(data);
  });
