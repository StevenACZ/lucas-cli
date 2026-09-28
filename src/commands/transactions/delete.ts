import { Command, Option } from "commander";
import { apiRequest } from "../../lib/api-client.js";
import { accountsAfterWrite } from "../../lib/effects.js";
import { output } from "../../lib/output.js";
import { resourcePath } from "../../lib/resource-path.js";
import { transactionView } from "../../lib/views.js";

type Row = Record<string, unknown>;

export const deleteTransactionCommand = new Command("delete")
  .description("Move a transaction to the trash (restore with lucas trash)")
  .argument("<id>", "Transaction id")
  .addOption(new Option("--yes").hideHelp())
  .action(async (id: string) => {
    const path = resourcePath("/api/transactions", id);
    const transaction = await apiRequest<Row>("GET", path);
    await apiRequest("DELETE", path);
    const [account] = await accountsAfterWrite([
      transaction.accountId as string | undefined,
    ]);
    output.success({ deleted: transactionView(transaction), account });
  });
