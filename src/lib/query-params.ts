import { output } from "./output.js";
import { parseOptionalNumber } from "./number-parser.js";

// Single helper behind every list command's query builder: keeps only entries
// with a value and returns undefined when nothing was set.
export function compactParams(
  entries: Record<string, string | undefined>,
): Record<string, string> | undefined {
  const params: Record<string, string> = {};
  for (const [key, value] of Object.entries(entries)) {
    if (value !== undefined && value !== "") params[key] = value;
  }
  return Object.keys(params).length > 0 ? params : undefined;
}

export function setOptionalIntegerQueryParam(
  params: Record<string, string>,
  input: {
    value: unknown;
    flag: string;
    queryKey: string;
    min: number;
    max: number;
  },
): void {
  const parsed = parseOptionalNumber(input.value, input.flag);
  if (parsed === undefined) return;

  if (!Number.isInteger(parsed) || parsed < input.min || parsed > input.max) {
    output.error(`Invalid value for ${input.flag}`, 400, {
      value: input.value,
      expected: `${input.min}-${input.max}`,
    });
  }

  params[input.queryKey] = String(parsed);
}
