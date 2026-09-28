import { Command, Option } from "commander";
import { choice } from "../../lib/choices.js";
import { invalidValue } from "../../lib/errors.js";
import { parseAmount } from "../../lib/number-parser.js";
import { resolveAccountId } from "../../lib/resolve.js";
import {
  PAYMENT_SOURCES,
  resolvePaymentSource,
  sendCardPayment,
} from "./pay-expense.js";

export interface BatchExpenseItem {
  transactionId: string;
  amount?: number;
}

export function parseExpenseItem(spec: string): BatchExpenseItem {
  const [transactionId, amount, ...rest] = spec.split("=");
  if (!transactionId || rest.length > 0) {
    throw invalidValue(
      `Invalid --item value "${spec}". Use <transactionId> or <transactionId>=<amount>.`,
      { value: spec },
    );
  }
  if (amount === undefined) return { transactionId };
  return { transactionId, amount: parseAmount(amount, "--item amount") };
}

function collectItem(spec: string, items: BatchExpenseItem[]) {
  return [...items, parseExpenseItem(spec)];
}

export const payExpensesCommand = new Command("pay-expenses")
  .description(
    "Pay up to 50 credit-card expenses in one atomic batch from a single funding source",
  )
  .argument("<account>", "Credit account name or id")
  .requiredOption(
    "--source <source>",
    "ACCOUNT, EXTERNAL or CASHBACK",
    choice(PAYMENT_SOURCES),
  )
  .option(
    "--from-account <name|id>",
    "Funding account (required with --source ACCOUNT)",
  )
  .addOption(new Option("--from-account-id <id>").hideHelp())
  .requiredOption(
    "--item <transactionId[=amount]>",
    "Expense to pay; repeat per expense. Omit =amount to pay the remaining amount",
    collectItem,
    [] as BatchExpenseItem[],
  )
  .option("--dry-run", "Resolve and validate, print the request, write nothing")
  .addHelpText(
    "after",
    `
Notes:
  - All-or-nothing: every expense is validated before anything is written.

Examples:
  lucas accounts pay-expenses "Visa Signature" --source ACCOUNT --from-account "Soles" --item tx_1 --item tx_2=50
  lucas accounts pay-expenses "Visa Signature" --source CASHBACK --item tx_1 --dry-run
`,
  )
  .action(async (ref: string, opts) => {
    const items = opts.item as BatchExpenseItem[];
    if (items.length === 0) {
      throw invalidValue("At least one --item is required");
    }
    const fromAccountId = await resolvePaymentSource(opts);
    const cardId = String(await resolveAccountId(ref));
    const body: Record<string, unknown> = {
      source: opts.source,
      ...(fromAccountId && { fromAccountId }),
      items,
    };
    await sendCardPayment(cardId, "pay-expenses", body, opts.dryRun);
  });
