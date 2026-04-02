// Salida JSON estandarizada para consumo por AI agents

export const output = {
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
