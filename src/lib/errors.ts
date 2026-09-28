export const EXIT = {
  OK: 0,
  FAILURE: 1,
  USAGE: 2,
  AUTH: 3,
  NOT_FOUND: 4,
  RATE_LIMITED: 5,
} as const;

export type ExitCode = (typeof EXIT)[keyof typeof EXIT];

export interface CliErrorInit {
  code: string;
  message: string;
  status?: number;
  hint?: string;
  details?: unknown;
  exitCode?: ExitCode;
}

export class CliError extends Error {
  readonly code: string;
  readonly status?: number;
  readonly hint?: string;
  readonly details?: unknown;
  readonly exitCode: ExitCode;

  constructor(init: CliErrorInit) {
    super(init.message);
    this.name = "CliError";
    this.code = init.code;
    this.status = init.status;
    this.hint = init.hint;
    this.details = init.details;
    this.exitCode = init.exitCode ?? exitCodeFor(init.code, init.status);
  }
}

const USAGE_CODES = new Set([
  "USAGE",
  "UNKNOWN_OPTION",
  "UNKNOWN_COMMAND",
  "MISSING_OPTION",
  "MISSING_ARGUMENT",
  "INVALID_VALUE",
  "AMBIGUOUS",
  "CONFIRMATION_REQUIRED",
]);

const AUTH_CODES = new Set([
  "UNAUTHENTICATED",
  "UNAUTHORIZED",
  "TOKEN_EXPIRED",
  "CLI_READ_ONLY",
  "CLI_FORBIDDEN_ENDPOINT",
]);

export function exitCodeFor(code?: string, status?: number): ExitCode {
  if (code && USAGE_CODES.has(code)) return EXIT.USAGE;
  if (code && AUTH_CODES.has(code)) return EXIT.AUTH;
  if (code === "NOT_FOUND") return EXIT.NOT_FOUND;
  if (code === "RATE_LIMITED") return EXIT.RATE_LIMITED;
  if (status === 401 || status === 403) return EXIT.AUTH;
  if (status === 404) return EXIT.NOT_FOUND;
  if (status === 429) return EXIT.RATE_LIMITED;
  if (status !== undefined && status >= 400 && status < 500) return EXIT.USAGE;
  return EXIT.FAILURE;
}

export function codeForStatus(status?: number): string {
  if (status === 401) return "UNAUTHORIZED";
  if (status === 403) return "FORBIDDEN";
  if (status === 404) return "NOT_FOUND";
  if (status === 409) return "CONFLICT";
  if (status === 429) return "RATE_LIMITED";
  if (status !== undefined && status >= 400 && status < 500) {
    return "VALIDATION_FAILED";
  }
  return "REQUEST_FAILED";
}

export function invalidValue(message: string, details?: unknown): CliError {
  return new CliError({ code: "INVALID_VALUE", message, details });
}

export function requireYes(yes: boolean | undefined, action: string): void {
  if (yes) return;
  throw new CliError({
    code: "CONFIRMATION_REQUIRED",
    message: `${action} is permanent and needs explicit confirmation`,
    hint: "Re-run with --yes",
  });
}
