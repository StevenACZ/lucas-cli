type FieldType = "number" | "boolean" | "string";

interface FieldMapping {
  opt: string;
  body: string;
  type?: FieldType;
}

export function buildBody(
  opts: Record<string, unknown>,
  fields: FieldMapping[],
): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  for (const { opt, body: key, type } of fields) {
    const val = opts[opt];
    if (val === false) {
      body[key] = null;
    } else if (val !== undefined) {
      if (type === "number") body[key] = Number(val);
      else if (type === "boolean") body[key] = true;
      else body[key] = val;
    }
  }
  return body;
}
