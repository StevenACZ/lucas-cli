import { Command } from "commander";
import { apiRequest } from "../../lib/api-client.js";
import { output } from "../../lib/output.js";
import { parseFiniteNumber } from "../../lib/number-parser.js";
import { resourcePath } from "../../lib/resource-path.js";

export interface BatchExpenseItem {
  transactionId: string;
  amount?: number;
}

export function parseExpenseItem(spec: string): BatchExpenseItem {
  const [transactionId, amount, ...rest] = spec.split("=");
  if (!transactionId || rest.length > 0) {
    output.error(
      `Invalid --item value "${spec}". Use <transactionId> or <transactionId>=<amount>.`,
      400,
      { value: spec },
    );
  }
  if (amount === undefined) return { transactionId };
  return { transactionId, amount: parseFiniteNumber(amount, "--item") };
}

function collectItem(spec: string, items: BatchExpenseItem[]) {
  return [...items, parseExpenseItem(spec)];
}

export const payExpensesCommand = new Command("pay-expenses")
  .description(
    "Pay up to 50 credit-card expenses in one atomic batch from a single funding source",
  )
  .argument("<id>", "Credit account ID")
  .requiredOption(
    "--source <source>",
    "Funding source (ACCOUNT|EXTERNAL|CASHBACK)",
  )
  .option(
    "--from-account-id <id>",
    "Funding account ID (required when --source ACCOUNT)",
  )
  .requiredOption(
    "--item <transactionId[=amount]>",
    "Expense to pay; repeat per expense. Omit =amount to pay the remaining amount",
    collectItem,
    [] as BatchExpenseItem[],
  )
  .addHelpText(
    "after",
    `
Notes:
  - All-or-nothing: every expense is validated before anything is written.

Examples:
  lucas accounts pay-expenses acc_123 --source ACCOUNT --from-account-id acc_456 --item tx_1 --item tx_2=50
  lucas accounts pay-expenses acc_123 --source CASHBACK --item tx_1
`,
  )
  .action(async (id: string, opts) => {
    const items = opts.item as BatchExpenseItem[];
    if (items.length === 0) {
      output.error("At least one --item is required", 400);
    }
    const body: Record<string, unknown> = {
      source: opts.source,
      items,
    };
    if (opts.fromAccountId) body.fromAccountId = opts.fromAccountId;
    const data = await apiRequest(
      "POST",
      resourcePath("/api/accounts", id, "pay-expenses"),
      body,
    );
    output.success(data);
  });
