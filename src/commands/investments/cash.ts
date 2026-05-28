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

export const createCashAdjustmentCommand = new Command("cash")
  .description("Create an investment cash adjustment")
  .argument("<account-id>", "Investment account ID")
  .requiredOption("--amount <amount>", "Signed cash amount")
  .option("--occurred-at <iso>", "Adjustment datetime (ISO 8601)")
  .option("--note <note>", "Adjustment note")
  .action(async (accountId: string, opts: CreateCashAdjustmentOptions) => {
    const data = await apiRequest(
      "POST",
      resourcePath("/api/investments/accounts", accountId, "cash-adjustments"),
      buildCreateCashAdjustmentBody(opts),
    );
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
