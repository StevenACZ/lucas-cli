import { Command, Option } from "commander";
import { apiRequest } from "../../lib/api-client.js";
import { choice } from "../../lib/choices.js";
import { accountsAfterWrite } from "../../lib/effects.js";
import { invalidValue } from "../../lib/errors.js";
import { parseAmount } from "../../lib/number-parser.js";
import { output } from "../../lib/output.js";
import { resolveAccountId } from "../../lib/resolve.js";
import { resourcePath } from "../../lib/resource-path.js";
import { stripHeavy } from "../../lib/views.js";

type Row = Record<string, unknown>;

export const PAYMENT_SOURCES = ["ACCOUNT", "EXTERNAL", "CASHBACK"];

export async function resolvePaymentSource(opts: {
  source: string;
  fromAccount?: string;
  fromAccountId?: string;
}): Promise<string | undefined> {
  const ref = opts.fromAccount ?? opts.fromAccountId;
  if (opts.source === "ACCOUNT" && !ref) {
    throw invalidValue("--from-account is required when --source ACCOUNT");
  }
  if (opts.source !== "ACCOUNT" && ref) {
    throw invalidValue("--from-account only applies to --source ACCOUNT");
  }
  return resolveAccountId(ref);
}

export async function sendCardPayment(
  cardId: string,
  action: "pay-expense" | "pay-expenses",
  body: Row,
  dryRun: boolean | undefined,
): Promise<void> {
  const path = resourcePath("/api/accounts", cardId, action);
  if (dryRun) {
    output.success({ dryRun: true, request: { method: "POST", path, body } });
    return;
  }
  const result = stripHeavy(await apiRequest<Row>("POST", path, body));
  delete result.account;
  const accounts = await accountsAfterWrite([
    cardId,
    body.fromAccountId as string | undefined,
  ]);
  output.success({ ...result, accounts });
}

export const payExpenseCommand = new Command("pay-expense")
  .description("Pay a single credit-card expense from a funding source")
  .argument("<account>", "Credit account name or id")
  .requiredOption("--transaction-id <id>", "Expense transaction id to settle")
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
  .option(
    "--amount <amount>",
    "Partial payment, positive with up to 2 decimals (default: the remaining amount)",
  )
  .option("--dry-run", "Resolve and validate, print the request, write nothing")
  .addHelpText(
    "after",
    `
Examples:
  lucas accounts pay-expense "Visa Signature" --transaction-id tx_1 --source ACCOUNT --from-account "Soles"
  lucas accounts pay-expense "Visa Signature" --transaction-id tx_1 --source CASHBACK --amount 25
`,
  )
  .action(async (ref: string, opts) => {
    const amount =
      opts.amount === undefined
        ? undefined
        : parseAmount(opts.amount, "--amount");
    const fromAccountId = await resolvePaymentSource(opts);
    const cardId = String(await resolveAccountId(ref));
    const body: Row = {
      transactionId: opts.transactionId,
      source: opts.source,
      ...(fromAccountId && { fromAccountId }),
      ...(amount !== undefined && { amount }),
    };
    await sendCardPayment(cardId, "pay-expense", body, opts.dryRun);
  });
