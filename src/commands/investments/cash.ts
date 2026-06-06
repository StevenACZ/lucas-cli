import { Command } from "commander";
import { apiRequest } from "../../lib/api-client.js";
import { buildBody } from "../../lib/body-builder.js";
import { parseFiniteNumber } from "../../lib/number-parser.js";
import { output } from "../../lib/output.js";
import { resourcePath } from "../../lib/resource-path.js";

interface CreateCashAdjustmentOptions {
  amount: string;
  occurredAt?: string;
  note?: string;
  type?: string;
  instrumentId?: string;
  symbol?: string;
}

interface UpdateCashAdjustmentOptions {
  amount?: string;
  occurredAt?: string;
  note?: string;
  clearNote?: boolean;
}

export function buildCreateCashAdjustmentBody(
  opts: CreateCashAdjustmentOptions,
): Record<string, unknown> {
  return {
    amount: parseFiniteNumber(opts.amount, "--amount"),
    ...(opts.occurredAt && { occurredAt: opts.occurredAt }),
    ...(opts.note && { note: opts.note }),
    ...(opts.type && { type: opts.type }),
    ...(opts.instrumentId && { instrumentId: opts.instrumentId }),
    ...(opts.symbol && { symbol: opts.symbol }),
  };
}

export function buildUpdateCashAdjustmentBody(
  opts: UpdateCashAdjustmentOptions,
): Record<string, unknown> {
  return buildBody(opts as Record<string, unknown>, [
    { opt: "amount", body: "amount", type: "number" },
    { opt: "occurredAt", body: "occurredAt" },
    { opt: "note", body: "note", clearOpt: "clearNote" },
  ]);
}

function postCashAdjustment(
  accountId: string,
  opts: CreateCashAdjustmentOptions,
) {
  return apiRequest(
    "POST",
    resourcePath("/api/investments/accounts", accountId, "cash-adjustments"),
    buildCreateCashAdjustmentBody(opts),
  );
}

export const createCashAdjustmentCommand = new Command("cash-adjustment")
  .description("Create an investment cash adjustment")
  .argument("<account-id>", "Investment account ID")
  .requiredOption("--amount <amount>", "Signed cash amount")
  .option("--occurred-at <iso>", "Adjustment datetime (ISO 8601)")
  .option("--note <note>", "Adjustment note")
  .action(async (accountId: string, opts: CreateCashAdjustmentOptions) => {
    const data = await postCashAdjustment(accountId, {
      ...opts,
      type: "ADJUSTMENT",
    });
    output.success(data);
  });

export const cashCommand = new Command("cash").description(
  "Record investment account cash movements",
);

cashCommand
  .command("deposit")
  .description("Record cash added to an investment account")
  .argument("<account-id>", "Investment account ID")
  .requiredOption("--amount <amount>", "Deposit amount")
  .option("--occurred-at <iso>", "Movement datetime (ISO 8601)")
  .option("--note <note>", "Movement note")
  .action(async (accountId: string, opts: CreateCashAdjustmentOptions) => {
    const data = await postCashAdjustment(accountId, {
      ...opts,
      type: "DEPOSIT",
    });
    output.success(data);
  });

cashCommand
  .command("withdraw")
  .description("Record cash removed from an investment account")
  .argument("<account-id>", "Investment account ID")
  .requiredOption("--amount <amount>", "Withdrawal amount")
  .option("--occurred-at <iso>", "Movement datetime (ISO 8601)")
  .option("--note <note>", "Movement note")
  .action(async (accountId: string, opts: CreateCashAdjustmentOptions) => {
    const amount = parseFiniteNumber(opts.amount, "--amount");
    const data = await postCashAdjustment(accountId, {
      ...opts,
      amount: String(-Math.abs(amount)),
      type: "WITHDRAWAL",
    });
    output.success(data);
  });

cashCommand
  .command("dividend")
  .description("Record an investment dividend")
  .argument("<account-id>", "Investment account ID")
  .option("--instrument-id <id>", "Dividend instrument ID")
  .option("--symbol <symbol>", "Dividend instrument ticker symbol")
  .requiredOption("--amount <amount>", "Dividend amount")
  .option("--occurred-at <iso>", "Movement datetime (ISO 8601)")
  .option("--note <note>", "Movement note")
  .action(async (accountId: string, opts: CreateCashAdjustmentOptions) => {
    if (Boolean(opts.instrumentId) === Boolean(opts.symbol)) {
      output.error("Send exactly one of --instrument-id or --symbol", 400);
    }
    const data = await postCashAdjustment(accountId, {
      ...opts,
      type: "DIVIDEND",
    });
    output.success(data);
  });

export const updateCashAdjustmentCommand = new Command("cash-update")
  .description("Update an investment cash adjustment")
  .argument("<adjustment-id>", "Cash adjustment ID")
  .option("--amount <amount>", "Signed cash amount")
  .option("--occurred-at <iso>", "Adjustment datetime (ISO 8601)")
  .option("--note <note>", "Adjustment note")
  .option("--clear-note", "Clear adjustment note")
  .action(async (adjustmentId: string, opts: UpdateCashAdjustmentOptions) => {
    const data = await apiRequest(
      "PUT",
      resourcePath("/api/investments/cash-adjustments", adjustmentId),
      buildUpdateCashAdjustmentBody(opts),
    );
    output.success(data);
  });

export const deleteCashAdjustmentCommand = new Command("cash-delete")
  .description("Delete an investment cash adjustment")
  .argument("<adjustment-id>", "Cash adjustment ID")
  .action(async (adjustmentId: string) => {
    const data = await apiRequest(
      "DELETE",
      resourcePath("/api/investments/cash-adjustments", adjustmentId),
    );
    output.success(data);
  });
