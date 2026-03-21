// Salida JSON estandarizada para consumo por AI agents

export const output = {
  success<T>(data: T): void {
    console.log(JSON.stringify({ ok: true, data }, null, 2));
  },

  error(message: string, statusCode?: number): void {
    console.error(
      JSON.stringify({
        ok: false,
        error: { message, ...(statusCode && { statusCode }) },
      }),
    );
    process.exit(1);
  },
};
