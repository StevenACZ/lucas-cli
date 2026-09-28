import { Command } from "commander";
import { apiRequest } from "../../lib/api-client.js";
import { accountsAfterWrite } from "../../lib/effects.js";
import { invalidValue } from "../../lib/errors.js";
import { output } from "../../lib/output.js";
import { parseAmount, parseFiniteNumber } from "../../lib/number-parser.js";
import { resolveAccountId } from "../../lib/resolve.js";
import { resourcePath } from "../../lib/resource-path.js";
import { stripHeavy } from "../../lib/views.js";

type Row = Record<string, unknown>;

async function cashbackWrite(ref: string, action: string, body: Row) {
  const id = String(await resolveAccountId(ref));
  const result = stripHeavy(
    await apiRequest<Row>(
      "POST",
      resourcePath("/api/accounts", id, `cashback/${action}`),
      body,
    ),
  );
  delete result.account;
  const [account] = await accountsAfterWrite([id]);
  output.success({ ...result, account });
}

export const cashbackRedeemCommand = new Command("cashback-redeem")
  .description("Redeem accrued cashback as a generic card payment")
  .argument("<account>", "Credit account name or id")
  .requiredOption(
    "--amount <amount>",
    "Cashback to redeem: positive, up to 2 decimals",
  )
  .action(async (ref: string, opts: { amount: string }) => {
    await cashbackWrite(ref, "redeem", {
      amount: parseAmount(opts.amount, "--amount"),
    });
  });

export const cashbackAdjustCommand = new Command("cashback-adjust")
  .description("Set the card's accrued cashback to an explicit target balance")
  .argument("<account>", "Credit account name or id")
  .requiredOption("--balance <balance>", "Target cashback balance (>= 0)")
  .action(async (ref: string, opts: { balance: string }) => {
    const balance = parseFiniteNumber(opts.balance, "--balance");
    if (balance < 0) {
      throw invalidValue("--balance must be 0 or more", {
        value: opts.balance,
      });
    }
    await cashbackWrite(ref, "adjust", { balance });
  });
