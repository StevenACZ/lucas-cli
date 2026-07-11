// Standardized JSON output for consumption by scripts and AI agents.

interface Output {
  success<T>(data: T): void;
  error(message: string, statusCode?: number, details?: unknown): never;
}

export const output: Output = {
  success<T>(data: T): void {
    console.log(JSON.stringify({ ok: true, data }, null, 2));
  },

  error(message: string, statusCode?: number, details?: unknown): never {
    console.error(
      JSON.stringify({
        ok: false,
        error: {
          message,
          ...(statusCode && { statusCode }),
          ...(details !== undefined && { details }),
        },
      }),
    );
    process.exit(1);
  },
};
