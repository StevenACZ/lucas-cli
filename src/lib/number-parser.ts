import { output } from "./output.js";

export function parseFiniteNumber(value: unknown, flag: string): number {
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
