import { beforeEach, describe, expect, it, vi } from "vitest";

const saveCredentials = vi.fn();
const execFile = vi.fn();
const stderrWrite = vi
  .spyOn(process.stderr, "write")
  .mockImplementation(() => true);

vi.mock("../../src/lib/config.js", () => ({
  getApiUrl: () => "https://lucas.stevenacz.com",
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
          verifyUrl: "https://lucas.stevenacz.com/cli/authorize?code=ABCD-2345",
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
      apiUrl: "https://lucas.stevenacz.com",
      deviceName: "Mac CLI",
      pollIntervalMs: 1,
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "https://lucas.stevenacz.com/api/cli/poll/secret-poll-code",
    );
    const stderr = stderrWrite.mock.calls.map((call) => call[0]).join("");
    expect(stderr).toContain("ABCD-2345");
    expect(stderr).not.toContain("secret-poll-code");
    expect(saveCredentials).toHaveBeenCalledWith(
      expect.objectContaining({ token: "cli-token" }),
    );
  });
});
