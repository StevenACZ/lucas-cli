import { beforeEach, describe, expect, it, vi } from "vitest";

const saveCredentials = vi.fn();
const execFile = vi.fn();
const stderrWrite = vi
  .spyOn(process.stderr, "write")
  .mockImplementation(() => true);

vi.mock("../../src/lib/config.js", () => ({
  getApiUrl: () => "https://api.lucasapp.app",
  saveCredentials,
}));

vi.mock("child_process", () => ({
  execFile,
}));

const { runLogin } = await import("../../src/commands/auth/login.js");

describe("auth login", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    stderrWrite.mockClear();
  });

  it("shows userCode but polls with the secret deviceCode", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          deviceCode: "secret-poll-code",
          userCode: "ABCD-2345",
          verifyUrl:
            "https://dashboard.lucasapp.app/cli/authorize?code=ABCD-2345",
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: "approved",
          token: "cli-token",
          expiresAt: "2026-06-01T00:00:00.000Z",
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
    expect(stderr).not.toContain("secret-poll-code");
    expect(saveCredentials).toHaveBeenCalledWith(
      expect.objectContaining({ token: "cli-token" }),
    );
  });

  it("prints a friendly error when device auth cannot reach the API", async () => {
    const exitSpy = vi.spyOn(process, "exit").mockImplementation((code) => {
      throw new Error(`process.exit ${code}`);
    });
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
    ).rejects.toThrow("process.exit 1");

    const stderr = stderrWrite.mock.calls.map((call) => call[0]).join("");
    expect(stderr).toContain(
      "Cannot reach LucasApp API at http://localhost:3000. Check your connection or use --api-url https://api.lucasapp.app",
    );
    expect(exitSpy).toHaveBeenCalledWith(1);
    exitSpy.mockRestore();
  });
});
