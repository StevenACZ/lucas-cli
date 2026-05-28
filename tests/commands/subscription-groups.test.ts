import { describe, expect, it } from "vitest";
import { parseGroupIds } from "../../src/commands/subscription-groups/index.js";

describe("subscription groups commands", () => {
  it("parses comma-separated group ids", () => {
    expect(parseGroupIds("group-1, group-2,,group-3")).toEqual([
      "group-1",
      "group-2",
      "group-3",
    ]);
  });
});
