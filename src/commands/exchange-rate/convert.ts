import { Command } from "commander";
import { apiRequest } from "../../lib/api-client.js";
import { output } from "../../lib/output.js";

interface ExchangeRateResponse {
  rate?: number;
  [key: string]: unknown;
}

export function withConvertedAmount<T extends ExchangeRateResponse>(
  data: T,
  amount?: string,
): T {
  if (!amount) return data;
  const numericAmount = Number(amount);
  const rate = Number(data.rate);
  if (!Number.isFinite(numericAmount) || !Number.isFinite(rate)) return data;
  return {
    ...data,
    amount: numericAmount,
    convertedAmount: Math.round(numericAmount * rate * 100) / 100,
  };
}

export const convertCommand = new Command("convert")
  .description("Convert between currencies")
  .option("--from <currency>", "Source currency")
  .option("--to <currency>", "Target currency")
  .option("--amount <amount>", "Amount to convert")
  .action(async (opts) => {
    const params: Record<string, string> = {};
    if (opts.from) params.from = opts.from;
    if (opts.to) params.to = opts.to;
    if (opts.amount) params.amount = opts.amount;

    const data = await apiRequest(
      "GET",
      "/api/exchange-rate/convert",
      undefined,
      params,
    );
    output.success(
      withConvertedAmount(data as ExchangeRateResponse, opts.amount),
    );
  });
