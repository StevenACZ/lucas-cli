import { parseFiniteNumber } from "./number-parser.js";

type FieldType = "number" | "boolean" | "string";

interface FieldMapping {
  opt: string;
  body: string;
  type?: FieldType;
  clearOpt?: string;
  clearValue?: unknown;
}

function flagName(opt: string): string {
  return `--${opt.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`;
}

export function buildBody(
  opts: Record<string, unknown>,
  fields: FieldMapping[],
): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  for (const { opt, body: key, type, clearOpt, clearValue } of fields) {
    if (clearOpt && opts[clearOpt] === true) {
      body[key] = clearValue ?? null;
      continue;
    }
    const val = opts[opt];
    if (val !== undefined) {
      if (type === "number") body[key] = parseFiniteNumber(val, flagName(opt));
      else if (type === "boolean") body[key] = Boolean(val);
      else body[key] = val;
    }
  }
  return body;
}
