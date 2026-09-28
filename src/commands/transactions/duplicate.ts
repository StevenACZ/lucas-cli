import { Command } from "commander";
import { apiRequest } from "../../lib/api-client.js";
import { accountsAfterWrite } from "../../lib/effects.js";
import { output } from "../../lib/output.js";
import { resourcePath } from "../../lib/resource-path.js";
import { stripHeavy, transactionView } from "../../lib/views.js";

type Row = Record<string, unknown>;

export const duplicateTransactionCommand = new Command("duplicate")
  .description("Duplicate a transaction (same account, amount and category)")
  .argument("<id>", "Transaction id")
  .option("--full", "Print the raw backend object")
  .action(async (id: string, opts: { full?: boolean }) => {
    const created = await apiRequest<Row>(
      "POST",
      resourcePath("/api/transactions", id, "duplicate"),
    );
    const [account] = await accountsAfterWrite([
      created.accountId as string | undefined,
    ]);
    output.success({
      transaction: opts.full ? stripHeavy(created) : transactionView(created),
      account,
    });
  });
