import { beforeEach, describe, expect, it, vi } from "vitest";

const saveCredentials = vi.fn();
const outputSuccess = vi.fn();
const outputError = vi.fn((message: string) => {
  throw new Error(message);
});
const stderrWrite = vi
  .spyOn(process.stderr, "write")
  .mockImplementation(() => true);

vi.mock("../../src/lib/config.js", () => ({
  getApiUrl: () => "https://api.lucasapp.app",
  saveCredentials,
}));

vi.mock("../../src/lib/output.js", () => ({
  output: {
    success: outputSuccess,
    error: outputError,
  },
}));

const { runLogin } = await import("../../src/commands/auth/login.js");

const futureExpiry = new Date(
  Date.now() + 90 * 24 * 60 * 60 * 1000,
).toISOString();

function startResponse() {
  return {
    ok: true,
    json: async () => ({
      deviceCode: "secret-poll-code",
      userCode: "ABCD-2345",
      expiresIn: 900,
    }),
  };
}

describe("auth login (device-auth v2)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    stderrWrite.mockClear();
  });

  it("shows userCode, polls with the secret deviceCode, and saves scoped credentials", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(startResponse())
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: "pending", expiresIn: 895 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: "approved",
          token: "cli-token",
          scope: "FULL",
          expiresAt: futureExpiry,
        }),
      });
    vi.stubGlobal("fetch", fetchMock);

    await runLogin({
      apiUrl: "https://api.lucasapp.app",
      deviceName: "Mac CLI",
      pollIntervalMs: 1,
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "https://api.lucasapp.app/api/cli/poll/secret-poll-code",
    );
    const stderr = stderrWrite.mock.calls.map((call) => call[0]).join("");
    expect(stderr).toContain("ABCD-2345");
    expect(stderr).toContain("Open LucasApp on your iPhone");
    expect(stderr).not.toContain("secret-poll-code");
    expect(saveCredentials).toHaveBeenCalledWith({
      token: "cli-token",
      apiUrl: "https://api.lucasapp.app",
      deviceName: "Mac CLI",
      expiresAt: futureExpiry,
      scope: "FULL",
    });
    expect(outputSuccess).toHaveBeenCalledWith({
      deviceName: "Mac CLI",
      scope: "FULL",
      expiresAt: futureExpiry,
    });
  });

  it("reports a denied device request without saving credentials", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(startResponse())
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: "denied" }),
      });
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      runLogin({
        apiUrl: "https://api.lucasapp.app",
        deviceName: "Mac CLI",
        pollIntervalMs: 1,
      }),
    ).rejects.toThrow(/denied from the app/);

    expect(saveCredentials).not.toHaveBeenCalled();
    expect(outputSuccess).not.toHaveBeenCalled();
    expect(outputError).toHaveBeenCalledWith(
      expect.stringContaining("denied"),
      403,
      { code: "DEVICE_DENIED" },
    );
  });

  it("reports an expired device code", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(startResponse())
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: "expired" }),
      });
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      runLogin({
        apiUrl: "https://api.lucasapp.app",
        deviceName: "Mac CLI",
        pollIntervalMs: 1,
      }),
    ).rejects.toThrow(/expired/);

    expect(saveCredentials).not.toHaveBeenCalled();
    expect(outputError).toHaveBeenCalledWith(
      expect.stringContaining("expired"),
      410,
      { code: "DEVICE_CODE_EXPIRED" },
    );
  });

  it("does not open a browser or mention a verify URL", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(startResponse())
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: "approved",
          token: "cli-token",
          scope: "READ_ONLY",
          expiresAt: futureExpiry,
        }),
      });
    vi.stubGlobal("fetch", fetchMock);

    await runLogin({
      apiUrl: "https://api.lucasapp.app",
      deviceName: "Mac CLI",
      pollIntervalMs: 1,
    });

    const stderr = stderrWrite.mock.calls.map((call) => call[0]).join("");
    expect(stderr).not.toMatch(/browser|verify|dashboard/i);
  });

  it("prints a friendly error when device auth cannot reach the API", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("fetch failed");
      }),
    );

    await expect(
      runLogin({
        apiUrl: "http://localhost:3000",
        deviceName: "Mac CLI",
        pollIntervalMs: 1,
      }),
    ).rejects.toThrow(
      "Cannot reach LucasApp API at http://localhost:3000. Check your connection or use --api-url https://api.lucasapp.app",
    );
  });
});
