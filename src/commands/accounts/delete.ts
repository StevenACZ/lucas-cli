import { Command } from "commander";
import { apiRequest } from "../../lib/api-client.js";
import { output } from "../../lib/output.js";
import { resourcePath } from "../../lib/resource-path.js";

export const deleteAccountCommand = new Command("delete")
  .description("Delete an account")
  .argument("<id>", "Account ID")
  .action(async (id: string) => {
    const data = await apiRequest("DELETE", resourcePath("/api/accounts", id));
    output.success(data);
  });
