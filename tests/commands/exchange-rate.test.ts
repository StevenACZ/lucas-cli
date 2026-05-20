import { describe, expect, it } from "vitest";
import { withConvertedAmount } from "../../src/commands/exchange-rate/convert.js";

describe("exchange-rate convert", () => {
  it("adds a client-side convertedAmount when amount is supplied", () => {
    expect(
      withConvertedAmount(
        { success: true, rate: 3.734, from: "USD", to: "PEN" },
        "12.5",
      ),
    ).toEqual({
      success: true,
      rate: 3.734,
      from: "USD",
      to: "PEN",
      amount: 12.5,
      convertedAmount: 46.68,
    });
  });

  it("leaves the backend response unchanged when amount is missing", () => {
    const response = { success: true, rate: 3.7 };

    expect(withConvertedAmount(response)).toBe(response);
  });
});
