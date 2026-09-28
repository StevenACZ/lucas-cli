// Every invocation prints exactly one JSON document on stdout, success or
// failure, so agents can always parse stdout and branch on `ok` + exit code.
import { CliError, codeForStatus, EXIT } from "./errors.js";

export type Meta = Record<string, unknown>;

function shouldPrettyPrint(): boolean {
  if (process.env.LUCAS_PRETTY === "1") return true;
  if (process.env.LUCAS_PRETTY === "0") return false;
  return Boolean(process.stdout.isTTY);
}

export function printJson(value: unknown): void {
  const text = shouldPrettyPrint()
    ? JSON.stringify(value, null, 2)
    : JSON.stringify(value);
  process.stdout.write(`${text}\n`);
}

export function errorEnvelope(error: CliError): Record<string, unknown> {
  return {
    ok: false,
    error: {
      code: error.code,
      message: error.message,
      ...(error.status !== undefined && { status: error.status }),
      ...(error.hint && { hint: error.hint }),
      ...(error.details !== undefined && { details: error.details }),
    },
  };
}

function fromLegacyError(
  message: string,
  statusCode?: number,
  details?: unknown,
): CliError {
  const record =
    details && typeof details === "object" && !Array.isArray(details)
      ? { ...(details as Record<string, unknown>) }
      : undefined;
  const code =
    (typeof record?.code === "string" && record.code) ||
    (statusCode === undefined ? "INVALID_VALUE" : codeForStatus(statusCode));
  if (record) {
    delete record.code;
    delete record.statusCode;
    if (record.message === message) delete record.message;
  }
  const rest =
    record && Object.keys(record).length > 0
      ? record
      : Array.isArray(details)
        ? details
        : undefined;
  return new CliError({ code, message, status: statusCode, details: rest });
}

interface Output {
  success<T>(data: T, meta?: Meta): void;
  error(message: string, statusCode?: number, details?: unknown): never;
  fail(error: CliError): never;
}

export const output: Output = {
  success<T>(data: T, meta?: Meta): void {
    printJson({
      ok: true,
      data,
      ...(meta && Object.keys(meta).length > 0 && { meta }),
    });
  },

  error(message: string, statusCode?: number, details?: unknown): never {
    return output.fail(fromLegacyError(message, statusCode, details));
  },

  fail(error: CliError): never {
    printJson(errorEnvelope(error));
    process.exit(error.exitCode ?? EXIT.FAILURE);
  },
};
