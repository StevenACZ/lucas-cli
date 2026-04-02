import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildBody } from "../../src/lib/body-builder.js";
import { output } from "../../src/lib/output.js";

describe("buildBody", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("builds booleans, numbers, and clear flags correctly", () => {
    const body = buildBody(
      {
        isPrimary: false,
        principal: "1500.25",
        clearAccountId: true,
      },
      [
        { opt: "isPrimary", body: "isPrimary", type: "boolean" },
        { opt: "principal", body: "principal", type: "number" },
        {
          opt: "accountId",
          body: "paymentAccountId",
          clearOpt: "clearAccountId",
        },
      ],
    );

    expect(body).toEqual({
      isPrimary: false,
      principal: 1500.25,
      paymentAccountId: null,
    });
  });

  it("fails fast on invalid numeric values", () => {
    vi.spyOn(output, "error").mockImplementation((message) => {
      throw new Error(message);
    });

    expect(() =>
      buildBody({ amount: "NaN" }, [
        { opt: "amount", body: "amount", type: "number" },
      ]),
    ).toThrow("Invalid numeric value for --amount");
  });
});
