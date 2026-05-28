import { describe, expect, it } from "vitest";
import { buildPendingChargesParams } from "../../src/commands/subscription-charges/index.js";

describe("subscription charges commands", () => {
  it("builds pending charge pagination params", () => {
    expect(buildPendingChargesParams({ limit: "10", offset: "20" })).toEqual({
      limit: "10",
      offset: "20",
    });
    expect(buildPendingChargesParams({})).toBeUndefined();
  });
});
