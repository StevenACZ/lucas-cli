import { Command } from "commander";
import { apiRequest } from "../../lib/api-client.js";
import { requireYes } from "../../lib/errors.js";
import { output } from "../../lib/output.js";
import { resolveAccount } from "../../lib/resolve.js";
import { resourcePath } from "../../lib/resource-path.js";
import { accountRef } from "../../lib/views.js";

export const deleteAccountCommand = new Command("delete")
  .description("Delete an account and its movements (permanent)")
  .argument("<account>", "Account name or id")
  .option("--yes", "Confirm the permanent deletion")
  .action(async (ref: string, opts: { yes?: boolean }) => {
    requireYes(opts.yes, "Deleting an account");
    const account = await resolveAccount(ref);
    await apiRequest(
      "DELETE",
      resourcePath("/api/accounts", String(account.id)),
    );
    output.success({ deleted: accountRef(account) });
  });
