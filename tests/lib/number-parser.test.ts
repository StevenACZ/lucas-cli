import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  parseFiniteNumber,
  parseOptionalNumber,
} from "../../src/lib/number-parser.js";
import { output } from "../../src/lib/output.js";

describe("parseFiniteNumber", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(output, "error").mockImplementation((message) => {
      throw new Error(message);
    });
  });

  it("rejects an empty string instead of coercing it to 0", () => {
    expect(() => parseFiniteNumber("", "--balance")).toThrow(
      "Invalid numeric value for --balance",
    );
  });

  it("rejects a whitespace-only string instead of coercing it to 0", () => {
    expect(() => parseFiniteNumber("   ", "--balance")).toThrow(
      "Invalid numeric value for --balance",
    );
  });

  it("rejects an empty string through parseOptionalNumber", () => {
    expect(() => parseOptionalNumber("", "--loan-amount")).toThrow(
      "Invalid numeric value for --loan-amount",
    );
  });

  it("still accepts a real zero and other finite values", () => {
    expect(parseFiniteNumber("0", "--balance")).toBe(0);
    expect(parseFiniteNumber("-12.5", "--balance")).toBe(-12.5);
    expect(parseFiniteNumber(0, "--balance")).toBe(0);
    expect(parseOptionalNumber(undefined, "--balance")).toBeUndefined();
  });
});
