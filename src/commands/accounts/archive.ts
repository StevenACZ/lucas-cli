import { Command } from "commander";
import { apiRequest } from "../../lib/api-client.js";
import { output } from "../../lib/output.js";
import { resolveAccountId } from "../../lib/resolve.js";
import { resourcePath } from "../../lib/resource-path.js";
import { accountView } from "../../lib/views.js";

function archiveAction(action: "archive" | "unarchive") {
  return async (ref: string) => {
    const id = String(await resolveAccountId(ref));
    const account = await apiRequest<Record<string, unknown>>(
      "POST",
      resourcePath("/api/accounts", id, action),
    );
    output.success({ account: accountView(account) });
  };
}

export const archiveAccountCommand = new Command("archive")
  .description("Archive an account (hidden from lists and totals)")
  .argument("<account>", "Account name or id")
  .action(archiveAction("archive"));

export const unarchiveAccountCommand = new Command("unarchive")
  .description("Unarchive an account")
  .argument(
    "<account>",
    "Archived account id (names resolve active accounts only)",
  )
  .action(archiveAction("unarchive"));
