import { Command } from "commander";
import { apiRequest } from "../../lib/api-client.js";
import { invalidValue } from "../../lib/errors.js";
import { output } from "../../lib/output.js";
import { parseFiniteNumber } from "../../lib/number-parser.js";
import { accountView } from "../../lib/views.js";

const ACCOUNT_TYPES = ["DEBIT", "CREDIT", "CASH", "SAVINGS", "WALLET"];

export interface CreateAccountOptions {
  name: string;
  type: string;
  bank: string;
  currency?: string;
  balance?: string;
  creditLimit?: string;
  statementClosingDay?: string;
  cashbackEnabled?: boolean;
  cashbackRate?: string;
  color?: string;
  icon?: string;
  vault?: boolean;
}

export function buildCreateAccountBody(
  opts: CreateAccountOptions,
): Record<string, unknown> {
  const type = opts.type.trim().toUpperCase();
  if (type === "INVESTMENT") {
    throw invalidValue("Investment accounts are not available yet.");
  }
  if (!ACCOUNT_TYPES.includes(type)) {
    throw invalidValue(`--type must be one of ${ACCOUNT_TYPES.join(", ")}`, {
      value: opts.type,
    });
  }

  const body: Record<string, unknown> = {
    name: opts.name,
    type,
    bank: opts.bank,
    currency: (opts.currency ?? "PEN").toUpperCase(),
  };
  if (opts.balance !== undefined)
    body.initialBalance = parseFiniteNumber(opts.balance, "--balance");
  if (opts.creditLimit !== undefined)
    body.creditLimit = parseFiniteNumber(opts.creditLimit, "--credit-limit");
  if (opts.color) body.color = opts.color;
  if (opts.icon) body.icon = opts.icon;
  if (type === "CREDIT" && opts.statementClosingDay !== undefined) {
    const day = parseFiniteNumber(
      opts.statementClosingDay,
      "--statement-closing-day",
    );
    if (!Number.isInteger(day) || day < 1 || day > 31) {
      throw invalidValue(
        "--statement-closing-day must be an integer between 1 and 31",
        { value: opts.statementClosingDay },
      );
    }
    body.statementClosingDay = day;
  }
  if (opts.cashbackEnabled !== undefined)
    body.cashbackEnabled = opts.cashbackEnabled;
  if (opts.cashbackRate !== undefined)
    body.cashbackRate = parseFiniteNumber(opts.cashbackRate, "--cashback-rate");
  if (opts.vault !== undefined) body.vault = opts.vault;
  return body;
}

export async function runCreateAccount(opts: CreateAccountOptions) {
  const body = buildCreateAccountBody(opts);
  const account = await apiRequest<Record<string, unknown>>(
    "POST",
    "/api/accounts",
    body,
  );
  output.success({ account: accountView(account) });
}

export const createAccountCommand = new Command("create")
  .description("Create a new account")
  .requiredOption("--name <name>", "Account name")
  .requiredOption("--type <type>", "DEBIT, CREDIT, CASH, SAVINGS or WALLET")
  .requiredOption("--bank <bank>", "Bank name")
  .option("--currency <currency>", "ISO currency code, e.g. PEN or USD", "PEN")
  .option("--balance <balance>", "Opening balance (number)")
  .option("--credit-limit <limit>", "Credit limit (required for CREDIT)")
  .option(
    "--statement-closing-day <day>",
    "Statement closing day (1..31, CREDIT only)",
  )
  .option("--cashback-enabled", "Enable cashback (CREDIT only)")
  .option(
    "--cashback-rate <pct>",
    "Cashback rate percent per purchase (0.01..100, CREDIT only)",
  )
  .option("--color <color>", "Account color (#RRGGBB)")
  .option("--icon <icon>", "Account icon name")
  .option(
    "--vault",
    "Savings vault: counts toward totals but cannot fund payments (not CREDIT/INVESTMENT)",
  )
  .addHelpText(
    "after",
    `
Examples:
  lucas accounts create --name "Soles" --bank Interbank --type DEBIT --balance 1200
  lucas accounts create --name "Visa Signature" --bank BCP --type CREDIT \\
    --credit-limit 5000 --statement-closing-day 20
`,
  )
  .action(runCreateAccount);
