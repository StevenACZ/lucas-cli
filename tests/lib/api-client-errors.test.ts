import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const outputError = vi.fn((message: string) => {
  throw new Error(message);
});

vi.mock("../../src/lib/config.js", () => ({
  getApiUrl: () => "https://example.test",
  loadCredentials: () => ({
    token: "token",
    apiUrl: "https://example.test",
    deviceName: "test",
    expiresAt: "2999-01-01T00:00:00.000Z",
  }),
}));

vi.mock("../../src/lib/output.js", () => ({
  output: {
    error: outputError,
  },
}));

const { apiRequest } = await import("../../src/lib/api-client.js");

describe("apiRequest backend error codes", () => {
  const originalDebug = process.env.LUCAS_DEBUG;

  beforeEach(() => {
    outputError.mockClear();
    delete process.env.LUCAS_DEBUG;
  });

  afterEach(() => {
    if (originalDebug === undefined) {
      delete process.env.LUCAS_DEBUG;
    } else {
      process.env.LUCAS_DEBUG = originalDebug;
    }
  });

  it("maps AI_PLAN_REQUIRED to a CLI-friendly message", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        status: 403,
        json: async () => ({
          code: "AI_PLAN_REQUIRED",
          message: "raw backend message",
          details: {
            token: "secret-token",
            nested: { password: "super-secret" },
          },
        }),
      })),
    );

    await expect(apiRequest("GET", "/api/ai/usage")).rejects.toThrow(
      "Free plan includes 40 AI actions per month. Upgrade to Premium for 400 per month.",
    );
    expect(outputError).toHaveBeenCalledWith(
      "Free plan includes 40 AI actions per month. Upgrade to Premium for 400 per month.",
      403,
      {
        code: "AI_PLAN_REQUIRED",
        message: "raw backend message",
        statusCode: 403,
      },
    );
  });

  it("redacts backend details when LUCAS_DEBUG is enabled", async () => {
    process.env.LUCAS_DEBUG = "1";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        status: 500,
        json: async () => ({
          code: "INTERNAL_ERROR",
          message: "Backend failed",
          details: {
            accessToken: "secret-token",
            nested: { password: "super-secret", hint: "keep" },
          },
        }),
      })),
    );

    await expect(apiRequest("GET", "/api/accounts")).rejects.toThrow(
      "Backend failed",
    );

    expect(outputError).toHaveBeenCalledWith("Backend failed", 500, {
      code: "INTERNAL_ERROR",
      message: "Backend failed",
      statusCode: 500,
      details: {
        code: "INTERNAL_ERROR",
        message: "Backend failed",
        details: {
          accessToken: "[REDACTED]",
          nested: { password: "[REDACTED]", hint: "keep" },
        },
      },
    });
  });

  it("keeps safe backend error data visible without debug mode", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        status: 409,
        json: async () => ({
          statusMessage: "INVESTMENT_INSTRUMENT_AMBIGUOUS",
          message: "Instrument is ambiguous",
          data: {
            symbol: "ASML",
            candidates: [{ id: "inst-1", symbol: "ASML" }],
            token: "secret-token",
          },
        }),
      })),
    );

    await expect(apiRequest("GET", "/api/investments")).rejects.toThrow(
      "Instrument is ambiguous",
    );

    expect(outputError).toHaveBeenCalledWith("Instrument is ambiguous", 409, {
      code: "INVESTMENT_INSTRUMENT_AMBIGUOUS",
      message: "Instrument is ambiguous",
      data: {
        symbol: "ASML",
        candidates: [{ id: "inst-1", symbol: "ASML" }],
        token: "[REDACTED]",
      },
      statusCode: 409,
    });
  });

  it("maps network failures to a CLI-friendly message", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("fetch failed");
      }),
    );

    await expect(apiRequest("GET", "/api/accounts")).rejects.toThrow(
      "Cannot reach LucasApp API at https://example.test. Check your connection or run: lucas auth login",
    );

    expect(outputError).toHaveBeenCalledWith(
      "Cannot reach LucasApp API at https://example.test. Check your connection or run: lucas auth login",
      503,
      {
        code: "NETWORK_ERROR",
        apiUrl: "https://example.test",
        statusCode: 503,
      },
    );
  });

  it.each([
    [
      "AI_LIMIT_REACHED",
      "Premium AI limit reached. Try again after your quota resets.",
    ],
    ["SUBSCRIPTION_REQUIRED", "Subscriptions require Premium."],
    [
      "ACCOUNT_LIMIT_EXCEEDED",
      "Free plan allows up to 3 active accounts. Upgrade to Premium for unlimited accounts.",
    ],
  ])("maps %s to a CLI-friendly message", async (code, message) => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        status: 402,
        json: async () => ({ statusMessage: code }),
      })),
    );

    await expect(apiRequest("GET", "/api/subscriptions")).rejects.toThrow(
      message,
    );
  });
});
