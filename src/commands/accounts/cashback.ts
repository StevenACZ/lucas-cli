import { Command } from "commander";
import { apiRequest } from "../../lib/api-client.js";
import { output } from "../../lib/output.js";
import { parseFiniteNumber } from "../../lib/number-parser.js";
import { resourcePath } from "../../lib/resource-path.js";

export const cashbackRedeemCommand = new Command("cashback-redeem")
  .description("Redeem accrued cashback as a generic card payment")
  .argument("<id>", "Credit account ID")
  .requiredOption("--amount <amount>", "Cashback amount to redeem")
  .action(async (id: string, opts) => {
    const data = await apiRequest(
      "POST",
      resourcePath("/api/accounts", id, "cashback/redeem"),
      { amount: parseFiniteNumber(opts.amount, "--amount") },
    );
    output.success(data);
  });

export const cashbackAdjustCommand = new Command("cashback-adjust")
  .description("Set the card's accrued cashback to an explicit target balance")
  .argument("<id>", "Credit account ID")
  .requiredOption("--balance <balance>", "Target cashback balance (>= 0)")
  .action(async (id: string, opts) => {
    const data = await apiRequest(
      "POST",
      resourcePath("/api/accounts", id, "cashback/adjust"),
      { balance: parseFiniteNumber(opts.balance, "--balance") },
    );
    output.success(data);
  });
