import { Command } from "commander";
import { apiRequest } from "../../lib/api-client.js";
import { output } from "../../lib/output.js";
import { resourcePath } from "../../lib/resource-path.js";

export const deleteLoanCommand = new Command("delete")
  .description("Delete a loan")
  .argument("<id>", "Loan ID")
  .action(async (id: string) => {
    const data = await apiRequest("DELETE", resourcePath("/api/loans", id));
    output.success(data);
  });
