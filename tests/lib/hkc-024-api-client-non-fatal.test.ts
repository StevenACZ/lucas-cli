import { beforeEach, describe, expect, it, vi } from "vitest";

const outputError = vi.fn((message: string) => {
  throw new Error(message);
});

vi.mock("../../src/lib/config.js", () => ({
  getApiUrl: () => "https://example.test",
  loadCredentials: () => ({
    token: "token",
    apiUrl: "https://example.test",
    deviceName: "test",
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    scope: "FULL",
  }),
}));

vi.mock("../../src/lib/output.js", () => ({
  output: {
    error: outputError,
  },
}));

const { ApiError, apiRequest, apiRequestOrThrow } =
  await import("../../src/lib/api-client.js");

describe("apiRequestOrThrow", () => {
  beforeEach(() => {
    outputError.mockClear();
  });

  it("rejects with an ApiError instead of ending the process on a transport failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("fetch failed");
      }),
    );

    const error = await apiRequestOrThrow("GET", "/api/loans/loan_1").catch(
      (thrown: unknown) => thrown,
    );

    expect(error).toBeInstanceOf(ApiError);
    expect((error as InstanceType<typeof ApiError>).statusCode).toBe(503);
    expect(outputError).not.toHaveBeenCalled();
  });

  it("rejects with an ApiError instead of ending the process on a backend error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        status: 500,
        json: async () => ({ code: "INTERNAL_ERROR", message: "Backend down" }),
      })),
    );

    const error = await apiRequestOrThrow("GET", "/api/loans/loan_1").catch(
      (thrown: unknown) => thrown,
    );

    expect(error).toBeInstanceOf(ApiError);
    expect((error as Error).message).toBe("Backend down");
    expect(outputError).not.toHaveBeenCalled();
  });

  it("returns the parsed body on success", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => ({ id: "loan_1" }),
      })),
    );

    await expect(
      apiRequestOrThrow("GET", "/api/loans/loan_1"),
    ).resolves.toEqual({ id: "loan_1" });
    expect(outputError).not.toHaveBeenCalled();
  });

  it("leaves apiRequest fatal for every other command", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("fetch failed");
      }),
    );

    await expect(apiRequest("GET", "/api/accounts")).rejects.toThrow(
      "Cannot reach LucasApp API at https://example.test. Check your connection or run: lucas auth login",
    );
    expect(outputError).toHaveBeenCalledTimes(1);
  });
});
