import { invalidValue } from "./errors.js";
import { output } from "./output.js";

export function parseFiniteNumber(value: unknown, flag: string): number {
  // Number("") and Number("   ") are 0, so an unset shell variable would be
  // accepted as a real amount instead of failing.
  if (typeof value === "string" && value.trim() === "") {
    output.error(`Invalid numeric value for ${flag}`, 400, { value });
  }
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) {
    output.error(`Invalid numeric value for ${flag}`, 400, { value });
  }
  return parsed;
}

export function parseOptionalNumber(
  value: unknown,
  flag: string,
): number | undefined {
  return value === undefined ? undefined : parseFiniteNumber(value, flag);
}

const MONEY = /^\d+(\.\d{1,2})?$/;

// Money is always a positive amount with at most 2 decimals; the direction
// comes from --type (or the command), never from a sign.
export function parseAmount(value: unknown, flag: string): number {
  const text = String(value ?? "").trim();
  if (!MONEY.test(text) || Number(text) <= 0) {
    throw invalidValue(
      `${flag} must be a positive amount with up to 2 decimals (e.g. 12.50)`,
      { value },
    );
  }
  return Number(text);
}
