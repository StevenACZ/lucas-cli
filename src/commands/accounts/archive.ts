import { Command } from "commander";
import { apiRequest } from "../../lib/api-client.js";
import { output } from "../../lib/output.js";
import { resourcePath } from "../../lib/resource-path.js";

export const archiveAccountCommand = new Command("archive")
  .description("Archive an account")
  .argument("<id>", "Account ID")
  .action(async (id: string) => {
    const data = await apiRequest(
      "POST",
      resourcePath("/api/accounts", id, "archive"),
    );
    output.success(data);
  });

export const unarchiveAccountCommand = new Command("unarchive")
  .description("Unarchive an account")
  .argument("<id>", "Account ID")
  .action(async (id: string) => {
    const data = await apiRequest(
      "POST",
      resourcePath("/api/accounts", id, "unarchive"),
    );
    output.success(data);
  });
