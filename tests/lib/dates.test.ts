import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { formatLocalDateTime, parseDateOption } from "../../src/lib/dates.js";

const NOW = new Date("2026-09-28T03:30:00.000Z");

describe("dates", () => {
  beforeEach(() => {
    process.env.LUCAS_TZ = "America/Lima";
  });

  afterEach(() => {
    delete process.env.LUCAS_TZ;
  });

  it("resolves relative words in the CLI timezone", () => {
    expect(parseDateOption("today", "--date", NOW)).toBe("2026-09-27");
    expect(parseDateOption("HOY", "--date", NOW)).toBe("2026-09-27");
    expect(parseDateOption("yesterday", "--date", NOW)).toBe("2026-09-26");
    expect(parseDateOption("ayer", "--date", NOW)).toBe("2026-09-26");
  });

  it("passes real dates, local times and ISO with offset through", () => {
    expect(parseDateOption("2026-02-28")).toBe("2026-02-28");
    expect(parseDateOption("2026-09-01T08:15")).toBe("2026-09-01T08:15");
    expect(parseDateOption("2026-09-01T08:15:00-05:00")).toBe(
      "2026-09-01T08:15:00-05:00",
    );
    expect(parseDateOption(undefined)).toBeUndefined();
  });

  it.each(["2026-02-30", "2026-09-01T25:00", "01/09/2026", "tomorrow"])(
    "rejects %s with the accepted formats",
    (value) => {
      expect(() => parseDateOption(value, "--from")).toThrow(
        expect.objectContaining({
          code: "INVALID_VALUE",
          message: `Invalid date for --from: ${value}`,
        }),
      );
    },
  );

  it("formats backend instants as local date and time", () => {
    expect(formatLocalDateTime("2026-09-01T17:00:00.000Z")).toBe(
      "2026-09-01 12:00",
    );
    expect(formatLocalDateTime("nope")).toBeUndefined();
  });
});
