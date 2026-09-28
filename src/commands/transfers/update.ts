import { Command, Option } from "commander";
import { apiRequest } from "../../lib/api-client.js";
import { parseDateOption } from "../../lib/dates.js";
import { accountsAfterWrite } from "../../lib/effects.js";
import { parseAmount } from "../../lib/number-parser.js";
import { output } from "../../lib/output.js";
import { resolveAccountId } from "../../lib/resolve.js";
import { resourcePath } from "../../lib/resource-path.js";
import { transferView } from "../../lib/views.js";
import { parseRate } from "./create.js";
import { fetchTransfer } from "./get.js";

type Row = Record<string, unknown>;

interface UpdateTransferOptions {
  amount?: string;
  toAccount?: string;
  toAccountId?: string;
  toAmount?: string;
  clearToAmount?: boolean;
  description?: string;
  clearDescription?: boolean;
  date?: string;
  notes?: string;
  clearNotes?: boolean;
  rate?: string;
  exchangeRate?: string;
  clearRate?: boolean;
  clearExchangeRate?: boolean;
}

export async function buildTransferUpdateBody(
  id: string,
  opts: UpdateTransferOptions,
): Promise<Row> {
  const amount =
    opts.amount === undefined
      ? (await fetchTransfer(id)).amount
      : parseAmount(opts.amount, "--amount");
  const toAccountRef = opts.toAccount ?? opts.toAccountId;
  const rate = opts.rate ?? opts.exchangeRate;
  const date = parseDateOption(opts.date);
  return {
    amount,
    ...(toAccountRef !== undefined && {
      toAccountId: await resolveAccountId(toAccountRef),
    }),
    ...(opts.clearToAmount
      ? { toAmount: null }
      : opts.toAmount !== undefined && {
          toAmount: parseAmount(opts.toAmount, "--to-amount"),
        }),
    ...(opts.clearDescription
      ? { description: null }
      : opts.description !== undefined && { description: opts.description }),
    ...(date && { date }),
    ...(opts.clearNotes
      ? { notes: null }
      : opts.notes !== undefined && { notes: opts.notes }),
    ...(opts.clearRate || opts.clearExchangeRate
      ? { exchangeRate: null }
      : rate !== undefined && { exchangeRate: parseRate(rate) }),
  };
}

export const updateTransferCommand = new Command("update")
  .description("Update a transfer (a fee, if any, is a separate expense)")
  .argument("<id>", "Transfer id")
  .option(
    "--amount <amount>",
    "Amount leaving the source, positive with up to 2 decimals (default: unchanged)",
  )
  .option("--to-account <name|id>", "New destination account name or id")
  .addOption(new Option("--to-account-id <id>").hideHelp())
  .option("--to-amount <amount>", "Amount arriving (cross-currency)")
  .option("--clear-to-amount", "Clear the destination amount")
  .option("--description <text>", "Transfer description")
  .option("--clear-description", "Clear the description")
  .option(
    "--date <date>",
    "today, yesterday, YYYY-MM-DD (12:00 local) or YYYY-MM-DDTHH:mm",
  )
  .option("--notes <text>", "Free-form notes")
  .option("--clear-notes", "Clear the notes")
  .option("--rate <rate>", "Exchange rate source→destination")
  .addOption(new Option("--exchange-rate <rate>").hideHelp())
  .option("--clear-rate", "Clear the exchange rate")
  .addOption(new Option("--clear-exchange-rate").hideHelp())
  .addHelpText(
    "after",
    `
Examples:
  lucas transfers update tr_1 --notes "Rent September"
  lucas transfers update tr_1 --amount 380 --date 2026-09-01
`,
  )
  .action(async (id: string, opts: UpdateTransferOptions) => {
    const body = await buildTransferUpdateBody(id, opts);
    const result = await apiRequest<Row>(
      "PUT",
      resourcePath("/api/transfers", id),
      body,
    );
    const fromAccount = result.fromAccount as Row | undefined;
    const toAccount = result.toAccount as Row | undefined;
    const legs = [result.fromTransaction, result.toTransaction].filter(
      (leg): leg is Row => Boolean(leg),
    );
    const affected = (result.affectedAccounts as Row[] | undefined) ?? [];
    output.success({
      transfer: transferView(
        {
          id,
          fromAccountId: fromAccount?.id,
          toAccountId: toAccount?.id,
          fromAccount,
          toAccount,
        },
        legs,
      ),
      accounts: await accountsAfterWrite(
        [fromAccount, toAccount, ...affected].map(
          (account) => account?.id as string | undefined,
        ),
      ),
    });
  });
