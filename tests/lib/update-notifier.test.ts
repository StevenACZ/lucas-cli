import { afterEach, describe, expect, it, vi } from "vitest";

const fsMock = vi.hoisted(() => ({
  existsSync: vi.fn(() => false),
  readFileSync: vi.fn(() => "{}"),
  writeFileSync: vi.fn(() => {
    throw new Error("EACCES: permission denied, open 'update-check.json'");
  }),
}));

vi.mock("fs", () => fsMock);

vi.mock("../../src/lib/config.js", () => ({
  CONFIG_DIR: "/lucas-cli-test-config",
  ensureConfigDir: vi.fn(),
}));

const {
  isVersionNewer,
  maybeNotifyForUpdate,
  parseVersion,
  shouldRefreshUpdateCheck,
} = await import("../../src/lib/update-notifier.js");

describe("update notifier", () => {
  it("parses semantic versions defensively", () => {
    expect(parseVersion("v0.3.1")).toEqual([0, 3, 1]);
    expect(parseVersion("1.2")).toEqual([1, 2]);
  });

  it("detects when a newer version exists", () => {
    expect(isVersionNewer("0.3.0", "0.3.1")).toBe(true);
    expect(isVersionNewer("0.3.1", "0.3.1")).toBe(false);
    expect(isVersionNewer("0.3.2", "0.3.1")).toBe(false);
  });

  it("refreshes update checks only after the cache expires", () => {
    expect(shouldRefreshUpdateCheck(null, 0)).toBe(true);
    expect(
      shouldRefreshUpdateCheck(
        { lastCheckedAt: new Date(0).toISOString(), latestVersion: "0.3.1" },
        1000,
      ),
    ).toBe(false);
    expect(
      shouldRefreshUpdateCheck(
        { lastCheckedAt: new Date(0).toISOString(), latestVersion: "0.3.1" },
        1000 * 60 * 60 * 12 + 1,
      ),
    ).toBe(true);
  });
});

describe("maybeNotifyForUpdate", () => {
  const originalStdoutIsTTY = process.stdout.isTTY;
  const originalStderrIsTTY = process.stderr.isTTY;

  afterEach(() => {
    process.stdout.isTTY = originalStdoutIsTTY;
    process.stderr.isTTY = originalStderrIsTTY;
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("still notifies and never rejects when the cache cannot be written", async () => {
    process.stdout.isTTY = true;
    process.stderr.isTTY = true;
    vi.stubEnv("CI", "");
    vi.stubEnv("LUCAS_DISABLE_UPDATE_NOTIFIER", "");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ version: "9.9.9" }),
      })),
    );
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    await expect(maybeNotifyForUpdate("0.1.0")).resolves.toBeUndefined();

    expect(fsMock.writeFileSync).toHaveBeenCalled();
    expect(consoleError).toHaveBeenCalledWith(
      expect.stringContaining("0.1.0 -> 9.9.9"),
    );
  });
});
