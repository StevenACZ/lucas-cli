import { describe, expect, it } from "vitest";
import { verifyLoanPayment } from "../../src/lib/loan-verification.js";

describe("verifyLoanPayment", () => {
  it("fails when a fully paid installment still has a stale non-paid status", () => {
    const result = verifyLoanPayment({
      beforeLoan: {
        currency: "PEN",
        installments: [
          {
            id: "inst_1",
            sequence: 1,
            dueDate: "2026-04-01",
            dueAmount: 100,
            paidAmount: 0,
            lateFeeAdded: 0,
            status: "OVERDUE",
          },
        ],
      },
      afterLoan: {
        currency: "PEN",
        installments: [
          {
            id: "inst_1",
            sequence: 1,
            dueDate: "2026-04-01",
            dueAmount: 100,
            paidAmount: 100,
            lateFeeAdded: 0,
            status: "OVERDUE",
          },
        ],
      },
      expectedLoanReduction: 100,
      targetInstallmentId: "inst_1",
    });

    expect(result.verified).toBe(false);
    expect(result.reason).toBe("fully_paid_installment_still_not_marked_paid");
    expect(result.staleInstallmentIds).toEqual(["inst_1"]);
  });

  it("accepts a smaller balance drop when the server adds a late fee in the same payment", () => {
    const result = verifyLoanPayment({
      beforeLoan: {
        currency: "PEN",
        installments: [
          {
            id: "inst_1",
            sequence: 1,
            dueDate: "2026-04-01",
            dueAmount: 100,
            paidAmount: 0,
            lateFeeAdded: 0,
            status: "OVERDUE",
          },
        ],
      },
      afterLoan: {
        currency: "PEN",
        installments: [
          {
            id: "inst_1",
            sequence: 1,
            dueDate: "2026-04-01",
            dueAmount: 100,
            paidAmount: 100,
            lateFeeAdded: 50,
            status: "PARTIAL",
          },
        ],
      },
      expectedLoanReduction: 100,
      targetInstallmentId: "inst_1",
    });

    expect(result.verified).toBe(true);
    expect(result.actualLoanReduction).toBe(50);
    expect(result.lateFeesAdded).toBe(50);
    expect(result.reason).toBeUndefined();
  });

  it("still fails when the balance drop is short and no late fee was added", () => {
    const result = verifyLoanPayment({
      beforeLoan: {
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
      },
      afterLoan: {
        currency: "PEN",
        installments: [
          {
            id: "inst_1",
            sequence: 1,
            dueDate: "2026-04-01",
            dueAmount: 100,
            paidAmount: 40,
            lateFeeAdded: 0,
            status: "PARTIAL",
          },
        ],
      },
      expectedLoanReduction: 100,
      targetInstallmentId: "inst_1",
    });

    expect(result.verified).toBe(false);
    expect(result.reason).toBe("remaining_balance_did_not_drop_as_expected");
    expect(result.lateFeesAdded).toBe(0);
  });
});
