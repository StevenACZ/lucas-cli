import { Command } from "commander";
import { apiRequest } from "../../lib/api-client.js";
import { output } from "../../lib/output.js";
import { parseFiniteNumber } from "../../lib/number-parser.js";

export interface CreateAccountOptions {
  name: string;
  type: string;
  bank: string;
  currency?: string;
  balance?: string;
  creditLimit?: string;
  statementClosingDay?: string;
  color?: string;
  icon?: string;
}

export function buildCreateAccountBody(
  opts: CreateAccountOptions,
): Record<string, unknown> {
  const body: Record<string, unknown> = {
    name: opts.name,
    type: opts.type,
    bank: opts.bank,
    currency: opts.currency ?? "PEN",
  };
  if (opts.balance !== undefined)
    body.balance = parseFiniteNumber(opts.balance, "--balance");
  if (opts.creditLimit !== undefined)
    body.creditLimit = parseFiniteNumber(opts.creditLimit, "--credit-limit");
  if (opts.color) body.color = opts.color;
  if (opts.icon) body.icon = opts.icon;
  if (opts.type === "CREDIT" && opts.statementClosingDay !== undefined) {
    const day = parseFiniteNumber(
      opts.statementClosingDay,
      "--statement-closing-day",
    );
    if (!Number.isInteger(day) || day < 1 || day > 31) {
      throw new Error(
        "--statement-closing-day must be an integer between 1 and 31",
      );
    }
    body.statementClosingDay = day;
  }
  return body;
}

export async function runCreateAccount(opts: CreateAccountOptions) {
  let body: Record<string, unknown>;
  try {
    body = buildCreateAccountBody(opts);
  } catch (e) {
    output.error(e instanceof Error ? e.message : String(e), 400);
  }
  const data = await apiRequest("POST", "/api/accounts", body!);
  output.success(data);
}

export const createAccountCommand = new Command("create")
  .description("Create a new account")
  .requiredOption("--name <name>", "Account name")
  .requiredOption(
    "--type <type>",
    "Account type (DEBIT|CREDIT|CASH|SAVINGS|INVESTMENT|WALLET)",
  )
  .requiredOption("--bank <bank>", "Bank name")
  .option("--currency <currency>", "Currency code", "PEN")
  .option("--balance <balance>", "Initial balance")
  .option("--credit-limit <limit>", "Credit limit (required for CREDIT)")
  .option(
    "--statement-closing-day <day>",
    "Statement closing day (1..31, CREDIT only)",
  )
  .option("--color <color>", "Account color")
  .option("--icon <icon>", "Account icon")
  .action(runCreateAccount);
