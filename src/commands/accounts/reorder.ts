import { Command } from "commander";
import { apiRequest } from "../../lib/api-client.js";
import { invalidValue } from "../../lib/errors.js";
import { output } from "../../lib/output.js";
import { loadAccounts, resolveAccount } from "../../lib/resolve.js";
import { accountRef } from "../../lib/views.js";

export const reorderAccountsCommand = new Command("reorder")
  .description("Set the display order of accounts (first listed goes first)")
  .argument("<account...>", "Account names or ids, in the wanted order")
  .addHelpText(
    "after",
    `
Listed accounts go first, in the order given. Accounts left out follow them
in the order they already had.

Examples:
  lucas accounts reorder "Soles" "Visa Signature" "Efectivo"
`,
  )
  .action(async (refs: string[]) => {
    const listed = [];
    for (const ref of refs) listed.push(await resolveAccount(ref));
    const listedIds = new Set(listed.map((account) => String(account.id)));
    if (listedIds.size !== listed.length) {
      throw invalidValue("Each account can be listed only once", {
        value: refs,
      });
    }
    const rest = (await loadAccounts()).filter(
      (account) => !listedIds.has(String(account.id)),
    );
    const accounts = [...listed, ...rest];
    const ids = accounts.map((account) => String(account.id));
    await apiRequest("PUT", "/api/accounts/reorder", {
      orders: ids.map((id, displayOrder) => ({ id, displayOrder })),
    });
    output.success({
      reordered: accounts.map((account, displayOrder) => ({
        ...accountRef(account),
        displayOrder,
      })),
    });
  });
