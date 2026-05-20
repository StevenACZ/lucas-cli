import { describe, expect, it } from "vitest";
import { resourcePath, safePathSegment } from "../../src/lib/resource-path.js";

describe("resource path helpers", () => {
  it("builds resource paths for safe ids", () => {
    expect(resourcePath("/api/accounts", "acc_123-ABC")).toBe(
      "/api/accounts/acc_123-ABC",
    );
  });

  it.each(["../transactions/tx_1", "acc/123", "acc?x=1", "acc#frag", "%2e%2e"])(
    "rejects unsafe path segment %s",
    (id) => {
      expect(() => safePathSegment(id)).toThrow("Invalid resource id");
    },
  );
});
