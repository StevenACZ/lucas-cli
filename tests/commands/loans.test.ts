import { beforeEach, describe, expect, it, vi } from "vitest";

const apiRequest = vi.fn();
const outputSuccess = vi.fn();
const outputError = vi.fn((message: string) => {
  throw new Error(message);
});

vi.mock("../../src/lib/api-client.js", () => ({
  apiRequest,
}));

vi.mock("../../src/lib/output.js", () => ({
  output: {
    success: outputSuccess,
    error: outputError,
  },
}));

const { buildPayLoanPayload, executePayLoan, runPayLoan } =
  await import("../../src/commands/loans/pay.js");
const { executeMarkPaidLoan, runMarkPaidLoan } =
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

describe("loan commands", () => {
  beforeEach(() => {
    apiRequest.mockReset();
    outputSuccess.mockReset();
    outputError.mockClear();
  });

  it("buildPayLoanPayload sends canonical payAmount", () => {
    expect(
      buildPayLoanPayload({
        amount: "750",
        accountId: "acc_1",
        paidAt: "2026-04-02",
      }),
    ).toEqual({
      payAmount: 750,
      accountId: "acc_1",
      paidAt: "2026-04-02",
    });
  });

  it("executeMarkPaidLoan pays the next pending installment and verifies it", async () => {
    const beforeLoan = {
      id: "loan_1",
      currency: "PEN",
      installments: [
        {
          id: "inst_1",
          sequence: 1,
          dueDate: "2026-04-01",
          dueAmount: 120,
          paidAmount: 30,
          lateFeeAdded: 0,
          status: "PARTIAL",
        },
        {
          id: "inst_2",
          sequence: 2,
          dueDate: "2026-05-01",
          dueAmount: 120,
          paidAmount: 0,
          lateFeeAdded: 0,
          status: "PENDING",
        },
      ],
    };
    const afterLoan = {
      ...beforeLoan,
      installments: [
        {
          id: "inst_1",
          sequence: 1,
          dueDate: "2026-04-01",
          dueAmount: 120,
          paidAmount: 120,
          lateFeeAdded: 0,
          status: "PAID",
        },
        beforeLoan.installments[1],
      ],
    };

    let loanReads = 0;
    apiRequest.mockImplementation(async (method, path, body) => {
      if (method === "GET" && path === "/api/loans/loan_1") {
        loanReads += 1;
        return loanReads < 3 ? beforeLoan : afterLoan;
      }
      if (method === "POST" && path === "/api/loans/loan_1/pay") {
        expect(body).toMatchObject({
          payAmount: 90,
          notes: "mouse",
          paidAt: "2026-04-02",
        });
        return { paymentId: "pay_1" };
      }
      throw new Error(`Unexpected request: ${method} ${path}`);
    });

    const result = await executeMarkPaidLoan("loan_1", {
      notes: "mouse",
      paidAt: "2026-04-02",
      verified: true,
    });

    expect(result.markedInstallment).toEqual({
      id: "inst_1",
      sequence: 1,
      dueDate: "2026-04-01",
      remainingAmount: 90,
    });
    expect(result.verification?.verified).toBe(true);
    expect(result.loan).toEqual(afterLoan);
  });

  it("keeps the accepted payment when the verification read fails", async () => {
    let loanReads = 0;
    apiRequest.mockImplementation(async (method, path) => {
      if (method === "GET" && path === "/api/loans/loan_1") {
        loanReads += 1;
        if (loanReads === 1) return unpaidLoan;
        throw new Error("Cannot reach LucasApp API");
      }
      if (method === "POST" && path === "/api/loans/loan_1/pay") {
        return { paymentId: "pay_1" };
      }
      throw new Error(`Unexpected request: ${method} ${path}`);
    });

    const result = await executePayLoan("loan_1", {
      amount: 100,
      verified: true,
    });

    expect(result.payment).toEqual({ paymentId: "pay_1" });
    expect(result.loan).toBeUndefined();
    expect(result.verification?.verified).toBeNull();
    expect(result.verification?.reason).toBe("verification_unavailable");
  });

  it("runPayLoan succeeds when the payment applied but verification failed", async () => {
    apiRequest.mockImplementation(async (method, path) => {
      if (method === "GET" && path === "/api/loans/loan_1") return unpaidLoan;
      if (method === "POST" && path === "/api/loans/loan_1/pay") {
        return { paymentId: "pay_1" };
      }
      throw new Error(`Unexpected request: ${method} ${path}`);
    });

    await runPayLoan("loan_1", { amount: 100, verified: true });

    expect(outputError).not.toHaveBeenCalled();
    expect(outputSuccess).toHaveBeenCalledTimes(1);
    const payload = outputSuccess.mock.calls[0][0];
    expect(payload.payment).toEqual({ paymentId: "pay_1" });
    expect(payload.verification.verified).toBe(false);
    expect(payload.verification.reason).toBe(
      "remaining_balance_did_not_drop_as_expected",
    );
  });

  it("runMarkPaidLoan succeeds when the payment applied but verification failed", async () => {
    apiRequest.mockImplementation(async (method, path) => {
      if (method === "GET" && path === "/api/loans/loan_1") return unpaidLoan;
      if (method === "POST" && path === "/api/loans/loan_1/pay") {
        return { paymentId: "pay_1" };
      }
      throw new Error(`Unexpected request: ${method} ${path}`);
    });

    await runMarkPaidLoan("loan_1", { verified: true });

    expect(outputError).not.toHaveBeenCalled();
    expect(outputSuccess).toHaveBeenCalledTimes(1);
    const payload = outputSuccess.mock.calls[0][0];
    expect(payload.markedInstallment.id).toBe("inst_1");
    expect(payload.verification.verified).toBe(false);
  });
});
