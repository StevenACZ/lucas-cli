import { beforeEach, describe, expect, it, vi } from "vitest";

const apiRequest = vi.fn();

vi.mock("../../src/lib/api-client.js", () => ({
  apiRequest,
}));

const { buildPayLoanPayload } = await import("../../src/commands/loans/pay.js");
const { executeMarkPaidLoan } =
  await import("../../src/commands/loans/mark-paid.js");

describe("loan commands", () => {
  beforeEach(() => {
    apiRequest.mockReset();
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
});
