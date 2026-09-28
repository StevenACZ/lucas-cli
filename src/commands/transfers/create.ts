import { Command, Option } from "commander";
import { apiRequest } from "../../lib/api-client.js";
import { parseDateOption } from "../../lib/dates.js";
import { accountsAfterWrite } from "../../lib/effects.js";
import { invalidValue } from "../../lib/errors.js";
import { parseAmount, parseFiniteNumber } from "../../lib/number-parser.js";
import { output } from "../../lib/output.js";
import { resolveAccount, resolveCategory } from "../../lib/resolve.js";
import {
  accountRef,
  categoryView,
  transactionView,
  transferView,
} from "../../lib/views.js";

type Row = Record<string, unknown>;

interface CreateTransferOptions {
  fromAccount?: string;
  fromAccountId?: string;
  toAccount?: string;
  toAccountId?: string;
  amount: string;
  toAmount?: string;
  rate?: string;
  exchangeRate?: string;
  fee?: string;
  feeDescription?: string;
  feeCategory?: string;
  date?: string;
  description?: string;
  notes?: string;
  dryRun?: boolean;
}

export function parseRate(value: string | undefined): number | undefined {
  if (value === undefined) return undefined;
  const rate = parseFiniteNumber(value, "--rate");
  if (rate <= 0) throw invalidValue("--rate must be positive", { value });
  return rate;
}

export function defaultFeeDescription(description?: string): string {
  return description?.trim()
    ? `Comisión: ${description.trim()}`
    : "Comisión de transferencia";
}

export const createTransferCommand = new Command("create")
  .description(
    "Move money between two of your accounts, optionally with a fee charged to the source",
  )
  .option("--from-account <name|id>", "Source account name or id")
  .addOption(new Option("--from-account-id <id>").hideHelp())
  .option("--to-account <name|id>", "Destination account name or id")
  .addOption(new Option("--to-account-id <id>").hideHelp())
  .requiredOption(
    "--amount <amount>",
    "Amount leaving the source, positive with up to 2 decimals",
  )
  .option(
    "--to-amount <amount>",
    "Amount arriving (cross-currency; default derived from the rate)",
  )
  .option(
    "--rate <rate>",
    "Exchange rate source→destination (cross-currency; default: market rate)",
  )
  .addOption(new Option("--exchange-rate <rate>").hideHelp())
  .option(
    "--fee <amount>",
    "Fee charged to the source as a separate EXPENSE, atomic with the transfer",
  )
  .option(
    "--fee-description <text>",
    'Fee description (default "Comisión: <description>" or "Comisión de transferencia")',
  )
  .option("--fee-category <name|id>", "Fee expense category name, slug or id")
  .option(
    "--date <date>",
    "today, yesterday, YYYY-MM-DD (12:00 local) or YYYY-MM-DDTHH:mm; default now",
  )
  .option("--description <text>", "Transfer description")
  .option("--notes <text>", "Free-form notes")
  .option("--dry-run", "Resolve and validate, print the request, write nothing")
  .addHelpText(
    "after",
    `
Output: {transfer, fee, accounts}; accounts are both balances after the write.

Examples:
  lucas transfers create --from-account "Soles" --to-account "Dólares" --amount 370 \\
    --to-amount 100 --description "Cambio"
  lucas transfers create --from-account "Soles" --to-account "Ahorro" --amount 500 \\
    --fee 2.50 --fee-category "Bank fees" --dry-run
`,
  )
  .action(async (opts: CreateTransferOptions) => {
    const fromInput = opts.fromAccount ?? opts.fromAccountId;
    const toInput = opts.toAccount ?? opts.toAccountId;
    if (!fromInput)
      throw invalidValue("--from-account is required (name or id)");
    if (!toInput) throw invalidValue("--to-account is required (name or id)");
    const amount = parseAmount(opts.amount, "--amount");
    const toAmount =
      opts.toAmount === undefined
        ? undefined
        : parseAmount(opts.toAmount, "--to-amount");
    const exchangeRate = parseRate(opts.rate ?? opts.exchangeRate);
    const fee =
      opts.fee === undefined ? undefined : parseAmount(opts.fee, "--fee");
    if (fee === undefined && (opts.feeDescription || opts.feeCategory)) {
      throw invalidValue("--fee-description and --fee-category need --fee");
    }
    const date = parseDateOption(opts.date);

    const from = await resolveAccount(fromInput);
    const to = await resolveAccount(toInput);
    if (from.id === to.id) {
      throw invalidValue("--from-account and --to-account must differ");
    }
    const feeCategory =
      fee !== undefined && opts.feeCategory
        ? await resolveCategory(opts.feeCategory, "EXPENSE")
        : undefined;

    const body: Row = {
      fromAccountId: from.id,
      toAccountId: to.id,
      amount,
      ...(toAmount !== undefined && { toAmount }),
      ...(exchangeRate !== undefined && { exchangeRate }),
      ...(opts.description !== undefined && { description: opts.description }),
      ...(date && { date }),
      ...(opts.notes !== undefined && { notes: opts.notes }),
      ...(fee !== undefined && {
        fee: {
          amount: fee,
          description:
            opts.feeDescription ?? defaultFeeDescription(opts.description),
          ...(feeCategory && { categoryId: feeCategory.id }),
        },
      }),
    };

    if (opts.dryRun) {
      output.success({
        dryRun: true,
        request: { method: "POST", path: "/api/transfers", body },
        from: accountRef(from),
        to: accountRef(to),
        feeCategory: feeCategory ? categoryView(feeCategory) : null,
      });
      return;
    }

    const result = await apiRequest<Row>("POST", "/api/transfers", body);
    const record = (result.transfer as Row | undefined) ?? {
      id: result.transferId,
    };
    const legs = [result.fromTransaction, result.toTransaction].filter(
      (leg): leg is Row => Boolean(leg),
    );
    const feeTransaction = result.feeTransaction as Row | null | undefined;
    output.success({
      transfer: transferView(
        { ...record, fromAccount: from, toAccount: to },
        legs,
      ),
      fee: feeTransaction ? transactionView(feeTransaction) : null,
      accounts: await accountsAfterWrite([String(from.id), String(to.id)]),
    });
  });
