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
