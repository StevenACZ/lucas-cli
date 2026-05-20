import { describe, expect, it } from "vitest";
import { buildTransferListParams } from "../../src/commands/transfers/list.js";

describe("transfers list", () => {
  it("omits query params when no pagination flags are passed", () => {
    expect(buildTransferListParams({})).toBeUndefined();
  });

  it("passes backend pagination flags", () => {
    expect(buildTransferListParams({ limit: "5", offset: "10" })).toEqual({
      limit: "5",
      offset: "10",
    });
  });
});
