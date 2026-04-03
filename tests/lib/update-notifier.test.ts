import { describe, expect, it } from "vitest";
import {
  isVersionNewer,
  parseVersion,
  shouldRefreshUpdateCheck,
} from "../../src/lib/update-notifier.js";

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
