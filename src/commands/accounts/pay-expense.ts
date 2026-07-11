import { Command } from "commander";
import { apiRequest } from "../../lib/api-client.js";
import { buildBody } from "../../lib/body-builder.js";
import { output } from "../../lib/output.js";
import { resourcePath } from "../../lib/resource-path.js";

export const payExpenseCommand = new Command("pay-expense")
  .description("Pay a single credit-card expense from a funding source")
  .argument("<id>", "Credit account ID")
  .requiredOption("--transaction-id <id>", "Expense transaction ID to settle")
  .requiredOption(
    "--source <source>",
    "Funding source (ACCOUNT|EXTERNAL|CASHBACK)",
  )
  .option(
    "--from-account-id <id>",
    "Funding account ID (required when --source ACCOUNT)",
  )
  .option(
    "--amount <amount>",
    "Partial payment amount (defaults to the expense's remaining amount)",
  )
  .addHelpText(
    "after",
    `
Examples:
  lucas accounts pay-expense acc_123 --transaction-id tx_1 --source ACCOUNT --from-account-id acc_456
  lucas accounts pay-expense acc_123 --transaction-id tx_1 --source CASHBACK --amount 25
`,
  )
  .action(async (id: string, opts) => {
    const body = buildBody(opts, [
      { opt: "transactionId", body: "transactionId" },
      { opt: "source", body: "source" },
      { opt: "fromAccountId", body: "fromAccountId" },
      { opt: "amount", body: "amount", type: "number" },
    ]);
    const data = await apiRequest(
      "POST",
      resourcePath("/api/accounts", id, "pay-expense"),
      body,
    );
    output.success(data);
  });
