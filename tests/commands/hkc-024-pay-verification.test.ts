import { beforeEach, describe, expect, it, vi } from "vitest";

const outputError = vi.fn((message: string) => {
  throw new Error(message);
});
const outputSuccess = vi.fn();

vi.mock("../../src/lib/config.js", () => ({
  getApiUrl: () => "https://example.test",
  loadCredentials: () => ({
    token: "token",
    apiUrl: "https://example.test",
    deviceName: "test",
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    scope: "FULL",
  }),
}));

vi.mock("../../src/lib/output.js", () => ({
  output: {
    success: outputSuccess,
    error: outputError,
  },
}));

const { executePayLoan } = await import("../../src/commands/loans/pay.js");
const { executeMarkPaidLoan } =
  await import("../../src/commands/loans/mark-paid.js");

const unpaidLoan = {
  id: "loan_1",
  currency: "PEN",
  installments: [
    {
      id: "inst_1",
      sequence: 1,
      dueDate: "2026-04-01",
      dueAmount: 100,
      paidAmount: 0,
      lateFeeAdded: 0,
      status: "PENDING",
    },
  ],
};

function jsonResponse(body: unknown) {
  return {
    ok: true,
    status: 200,
    headers: { get: () => null },
    json: async () => body,
  };
}

describe("loans pay --verified when the verification read fails", () => {
  beforeEach(() => {
    outputError.mockClear();
    outputSuccess.mockClear();
  });

  it.each(["pay", "mark-paid"])(
    "verifies a backdated %s against the payment day's balance",
    async (command) => {
      const readDates: (string | null)[] = [];
      let paid = false;
      vi.stubGlobal(
        "fetch",
        vi.fn(async (url: string, init: { method: string; body?: string }) => {
          if (init.method === "POST") {
            expect(JSON.parse(init.body!)).toMatchObject({
              payAmount: 600,
              paidAt: "2026-04-01",
            });
            paid = true;
            return jsonResponse({ paymentId: "pay_1" });
          }
          const paymentDate = new URL(url).searchParams.get("paymentDate");
          readDates.push(paymentDate);
          return jsonResponse({
            ...unpaidLoan,
            installments: [
              {
                ...unpaidLoan.installments[0],
                dueAmount: 600,
                lateFeeAdded: !paid && paymentDate === null ? 15 : 0,
                paidAmount: paid ? 600 : 0,
                status: paid ? "PAID" : "PENDING",
              },
            ],
            payments: paid ? [{ id: "pay_1", loanAmount: 600 }] : [],
          });
        }),
      );

      const opts = { paidAt: "2026-04-01", verified: true };
      const result =
        command === "pay"
          ? await executePayLoan("loan_1", { ...opts, amount: 600 })
          : await executeMarkPaidLoan("loan_1", opts);

      expect(result.verification).toMatchObject({
        verified: true,
        expectedLoanReduction: 600,
        actualLoanReduction: 600,
        lateFeesAdded: 0,
      });
      expect(readDates).toEqual(
        Array(command === "pay" ? 2 : 3).fill("2026-04-01"),
      );
    },
  );

  it("keeps the persisted payment instead of exiting when the read times out", async () => {
    let loanReads = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init: { method: string }) => {
        if (init.method === "POST") return jsonResponse({ paymentId: "pay_1" });
        loanReads += 1;
        if (loanReads === 1) return jsonResponse(unpaidLoan);
        const aborted = new Error("This operation was aborted");
        aborted.name = "AbortError";
        throw aborted;
      }),
    );

    const result = await executePayLoan("loan_1", {
      amount: 100,
      verified: true,
    });

    expect(outputError).not.toHaveBeenCalled();
    expect(result.payment).toEqual({ paymentId: "pay_1" });
    expect(result.verification?.verified).toBeNull();
    expect(result.verification?.reason).toBe("verification_unavailable");
  });

  it("keeps the persisted payment when the read returns a server error", async () => {
    let loanReads = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init: { method: string }) => {
        if (init.method === "POST") return jsonResponse({ paymentId: "pay_1" });
        loanReads += 1;
        if (loanReads === 1) return jsonResponse(unpaidLoan);
        return {
          ok: false,
          status: 503,
          headers: { get: () => null },
          json: async () => ({ message: "Service unavailable" }),
        };
      }),
    );

    const result = await executePayLoan("loan_1", {
      amount: 100,
      verified: true,
    });

    expect(outputError).not.toHaveBeenCalled();
    expect(result.payment).toEqual({ paymentId: "pay_1" });
    expect(result.verification?.verified).toBeNull();
  });

  it("still fails before the mutation when the pre-read cannot be served", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("fetch failed");
      }),
    );

    await expect(
      executePayLoan("loan_1", { amount: 100, verified: true }),
    ).rejects.toThrow(/Cannot reach LucasApp API/);
    expect(outputError).toHaveBeenCalledTimes(1);
  });
});
