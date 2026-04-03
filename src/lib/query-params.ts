import { output } from "./output.js";
import { parseOptionalNumber } from "./number-parser.js";

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
