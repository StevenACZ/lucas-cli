import { beforeEach, describe, expect, it, vi } from "vitest";

const transport = vi.fn();
const outputSuccess = vi.fn();
const outputError = vi.fn((message: string) => {
  throw new Error(message);
});

const apiRequest = vi.fn(async (...args: unknown[]) => {
  try {
    return await transport(...args);
  } catch (error) {
    return outputError(error instanceof Error ? error.message : String(error));
  }
});
const apiRequestOrThrow = vi.fn((...args: unknown[]) => transport(...args));

vi.mock("../../src/lib/api-client.js", () => ({
  apiRequest,
  apiRequestOrThrow,
}));

vi.mock("../../src/lib/output.js", () => ({
  output: {
    success: outputSuccess,
    error: outputError,
  },
}));

vi.mock("../../src/lib/resolve.js", () => ({
  resolveAccountId: async (ref?: string) => ref,
  resolveLoanId: async (ref: string) => (ref === "Car loan" ? "loan_1" : ref),
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
    transport.mockReset();
    apiRequest.mockClear();
    apiRequestOrThrow.mockClear();
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
    transport.mockImplementation(async (method, path, body) => {
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
        return {
          paymentId: "pay_1",
          loan: { payments: [{ id: "pay_1", loanAmount: 90 }] },
        };
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
      remainingAfter: 0,
      fullyPaid: true,
    });
    expect(result.verification?.verified).toBe(true);
    expect(result.loan).toEqual(afterLoan);
  });

  it("reports the installment as not fully paid when a late fee leaves it owing", async () => {
    const overdueLoan = {
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
          status: "OVERDUE",
        },
      ],
    };
    const afterLoan = {
      ...overdueLoan,
      installments: [
        {
          ...overdueLoan.installments[0],
          paidAmount: 100,
          lateFeeAdded: 50,
          status: "PARTIAL",
        },
      ],
    };

    let loanReads = 0;
    transport.mockImplementation(async (method, path) => {
      if (method === "GET" && path === "/api/loans/loan_1") {
        loanReads += 1;
        return loanReads < 3 ? overdueLoan : afterLoan;
      }
      if (method === "POST" && path === "/api/loans/loan_1/pay") {
        return {
          paymentId: "pay_1",
          loan: { payments: [{ id: "pay_1", loanAmount: 100 }] },
        };
      }
      throw new Error(`Unexpected request: ${method} ${path}`);
    });

    await runMarkPaidLoan("loan_1", { verified: true });

    expect(outputError).not.toHaveBeenCalled();
    const payload = outputSuccess.mock.calls[0][0];
    expect(payload.verification.verified).toBe(true);
    expect(payload.markedInstallment.remainingAmount).toBe(100);
    expect(payload.markedInstallment.remainingAfter).toBe(50);
    expect(payload.markedInstallment.fullyPaid).toBe(false);
  });

  it("keeps the accepted payment when the verification read fails", async () => {
    let loanReads = 0;
    transport.mockImplementation(async (method, path) => {
      if (method === "GET" && path === "/api/loans/loan_1") {
        loanReads += 1;
        if (loanReads === 1) return unpaidLoan;
        throw new Error("Cannot reach LucasApp API");
      }
      if (method === "POST" && path === "/api/loans/loan_1/pay") {
        return {
          paymentId: "pay_1",
          loan: { payments: [{ id: "pay_1", loanAmount: 100 }] },
        };
      }
      throw new Error(`Unexpected request: ${method} ${path}`);
    });

    const result = await executePayLoan("loan_1", {
      amount: 100,
      verified: true,
    });

    expect(outputError).not.toHaveBeenCalled();
    expect(result.payment).toMatchObject({ paymentId: "pay_1" });
    expect(result.loan).toBeUndefined();
    expect(result.verification?.verified).toBeNull();
    expect(result.verification?.reason).toBe("verification_unavailable");
  });

  it("runPayLoan succeeds when the payment applied but verification failed", async () => {
    transport.mockImplementation(async (method, path) => {
      if (method === "GET" && path === "/api/loans/loan_1") return unpaidLoan;
      if (method === "POST" && path === "/api/loans/loan_1/pay") {
        return {
          paymentId: "pay_1",
          loan: { payments: [{ id: "pay_1", loanAmount: 100 }] },
        };
      }
      throw new Error(`Unexpected request: ${method} ${path}`);
    });

    await runPayLoan("loan_1", { amount: 100, verified: true });

    expect(outputError).not.toHaveBeenCalled();
    expect(outputSuccess).toHaveBeenCalledTimes(1);
    const payload = outputSuccess.mock.calls[0][0];
    expect(payload.payment).toMatchObject({ paymentId: "pay_1" });
    expect(payload.verification.verified).toBe(false);
    expect(payload.verification.reason).toBe(
      "remaining_balance_did_not_drop_as_expected",
    );
  });

  it("runPayLoan resolves the loan name and prints the request on --dry-run", async () => {
    await runPayLoan("Car loan", { amount: "350", dryRun: true });

    expect(transport).not.toHaveBeenCalled();
    expect(outputSuccess).toHaveBeenCalledWith({
      dryRun: true,
      request: {
        method: "POST",
        path: "/api/loans/loan_1/pay",
        body: { payAmount: 350 },
      },
    });
  });

  it("runMarkPaidLoan --dry-run reads the loan and writes nothing", async () => {
    transport.mockImplementation(async (method, path) => {
      if (method === "GET" && path === "/api/loans/loan_1") return unpaidLoan;
      throw new Error(`Unexpected request: ${method} ${path}`);
    });

    await runMarkPaidLoan("Car loan", { dryRun: true });

    expect(transport).toHaveBeenCalledTimes(1);
    expect(outputSuccess).toHaveBeenCalledWith({
      dryRun: true,
      request: {
        method: "POST",
        path: "/api/loans/loan_1/pay",
        body: { payAmount: 100 },
      },
      installment: {
        id: "inst_1",
        sequence: 1,
        dueDate: "2026-04-01",
        remainingAmount: 100,
      },
    });
  });

  it("runMarkPaidLoan succeeds when the payment applied but verification failed", async () => {
    transport.mockImplementation(async (method, path) => {
      if (method === "GET" && path === "/api/loans/loan_1") return unpaidLoan;
      if (method === "POST" && path === "/api/loans/loan_1/pay") {
        return {
          paymentId: "pay_1",
          loan: { payments: [{ id: "pay_1", loanAmount: 100 }] },
        };
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
  it.each([
    { amount: 36, accountId: "pen", exchangeRate: 10 / 36 },
    { amount: 36, accountId: "pen", loanAmount: 10 },
    { amount: 36, accountId: "pen", currency: "USD", exchangeRate: 10 / 36 },
  ])(
    "verifies the server credited amount despite payment currency: %j",
    async (opts) => {
      const before = {
        ...unpaidLoan,
        currency: "USD",
        installments: [{ ...unpaidLoan.installments[0], dueAmount: 10 }],
      };
      const after = {
        ...before,
        installments: [
          { ...before.installments[0], paidAmount: 10, status: "PAID" },
        ],
        payments: [{ id: "pay_1", loanAmount: 10 }],
      };
      transport
        .mockResolvedValueOnce(before)
        .mockResolvedValueOnce({ paymentId: "pay_1" })
        .mockResolvedValueOnce(after);
      const result = await executePayLoan("loan_1", {
        ...opts,
        verified: true,
      });
      expect(result.verification).toMatchObject({
        verified: true,
        expectedLoanReduction: 10,
      });
    },
  );

  it("does not guess a credited amount when the payment cannot be identified", async () => {
    transport
      .mockResolvedValueOnce(unpaidLoan)
      .mockResolvedValueOnce({ paymentId: "missing" })
      .mockResolvedValueOnce(unpaidLoan);
    const result = await executePayLoan("loan_1", {
      amount: 100,
      verified: true,
    });
    expect(result.verification?.verified).toBeNull();
  });

  it.each([false, true])(
    "requires a cross-currency rate before mutation or dry-run output (%s)",
    async (dryRun) => {
      transport
        .mockResolvedValueOnce({ ...unpaidLoan, currency: "USD" })
        .mockResolvedValueOnce({ currency: "PEN" });
      await expect(
        runMarkPaidLoan("loan_1", { accountId: "pen", dryRun }),
      ).rejects.toThrow(/exchange-rate/);
      expect(transport.mock.calls.some(([method]) => method === "POST")).toBe(
        false,
      );
      expect(outputSuccess).not.toHaveBeenCalled();
    },
  );

  it.each([0, -1, NaN, Infinity])(
    "rejects invalid cross-currency rate %s",
    async (exchangeRate) => {
      transport
        .mockResolvedValueOnce({ ...unpaidLoan, currency: "USD" })
        .mockResolvedValueOnce({ currency: "PEN" });
      await expect(
        runMarkPaidLoan("loan_1", {
          accountId: "pen",
          exchangeRate,
          dryRun: true,
        }),
      ).rejects.toThrow();
      expect(transport.mock.calls.some(([method]) => method === "POST")).toBe(
        false,
      );
    },
  );

  it("converts the remaining installment including partial payment and late fee using account currency", async () => {
    transport
      .mockResolvedValueOnce({
        ...unpaidLoan,
        currency: "USD",
        installments: [
          {
            ...unpaidLoan.installments[0],
            dueAmount: 12,
            paidAmount: 4,
            lateFeeAdded: 2,
          },
        ],
      })
      .mockResolvedValueOnce({ currency: "PEN" });
    await runMarkPaidLoan("loan_1", {
      accountId: "pen",
      currency: "USD",
      exchangeRate: 10 / 36,
      dryRun: true,
    });
    expect(outputSuccess).toHaveBeenCalledWith(
      expect.objectContaining({
        request: expect.objectContaining({
          body: {
            payAmount: 36,
            loanAmount: 10,
            exchangeRate: 10 / 36,
            payCurrency: "PEN",
            accountId: "pen",
          },
        }),
        installment: expect.objectContaining({ remainingAmount: 10 }),
      }),
    );
  });

  it("rounds the payment currency to cents while crediting the whole installment", async () => {
    transport.mockResolvedValueOnce({ ...unpaidLoan, currency: "USD" });
    await runMarkPaidLoan("loan_1", {
      currency: "PEN",
      exchangeRate: 3,
      dryRun: true,
    });
    expect(outputSuccess.mock.calls[0][0].request.body).toMatchObject({
      payAmount: 33.33,
      loanAmount: 100,
      exchangeRate: 3,
    });
  });

  it("keeps same-currency account payments unchanged without a rate", async () => {
    transport
      .mockResolvedValueOnce(unpaidLoan)
      .mockResolvedValueOnce({ currency: "PEN" });
    await runMarkPaidLoan("loan_1", { accountId: "pen", dryRun: true });
    expect(outputSuccess.mock.calls[0][0].request.body).toMatchObject({
      payAmount: 100,
      accountId: "pen",
    });
    expect(
      outputSuccess.mock.calls[0][0].request.body.loanAmount,
    ).toBeUndefined();
  });
  it("uses canonical credit when the backend ignores an explicit loan amount", async () => {
    const after = {
      ...unpaidLoan,
      installments: [
        { ...unpaidLoan.installments[0], paidAmount: 100, status: "PAID" },
      ],
    };
    transport
      .mockResolvedValueOnce(unpaidLoan)
      .mockResolvedValueOnce({
        paymentId: "pay_1",
        loan: { payments: [{ id: "pay_1", loanAmount: 100 }] },
      })
      .mockResolvedValueOnce(after);
    const result = await executePayLoan("loan_1", {
      amount: 100,
      loanAmount: 200,
      verified: true,
    });
    expect(result.verification).toMatchObject({
      verified: true,
      expectedLoanReduction: 100,
    });
  });

  it("posts a converted mark-paid amount and reports remaining in loan currency", async () => {
    const loan = {
      ...unpaidLoan,
      currency: "USD",
      installments: [{ ...unpaidLoan.installments[0], dueAmount: 10 }],
    };
    transport
      .mockResolvedValueOnce(loan)
      .mockResolvedValueOnce({ currency: "PEN" })
      .mockResolvedValueOnce({ paymentId: "pay_1" });
    const result = await executeMarkPaidLoan("loan_1", {
      accountId: "pen",
      exchangeRate: 10 / 36,
    });
    expect(transport).toHaveBeenLastCalledWith(
      "POST",
      "/api/loans/loan_1/pay",
      {
        payAmount: 36,
        loanAmount: 10,
        exchangeRate: 10 / 36,
        payCurrency: "PEN",
        accountId: "pen",
      },
    );
    expect(result.markedInstallment).toMatchObject({ remainingAmount: 10 });
  });

  it("rejects conversion that rounds to zero cents before posting", async () => {
    transport.mockResolvedValueOnce(unpaidLoan);
    await expect(
      executeMarkPaidLoan("loan_1", { currency: "USD", exchangeRate: 100000 }),
    ).rejects.toThrow(/one cent/);
    expect(transport.mock.calls.some(([method]) => method === "POST")).toBe(
      false,
    );
  });
  it.each([false, true])(
    "quotes mark-paid for the payment date before writing or previewing (%s)",
    async (dryRun) => {
      transport.mockImplementation(async (method, path, body, query) => {
        if (method === "GET" && path === "/api/loans/loan_1") {
          expect(query).toEqual({ paymentDate: "2026-03-01" });
          return unpaidLoan;
        }
        if (method === "POST" && path === "/api/loans/loan_1/pay") {
          expect(body).toEqual({ payAmount: 100, paidAt: "2026-03-01" });
          return { paymentId: "pay_1" };
        }
        throw new Error(`Unexpected request: ${method} ${path}`);
      });
      await runMarkPaidLoan("loan_1", { paidAt: "2026-03-01", dryRun });
      if (dryRun) {
        expect(transport).toHaveBeenCalledTimes(1);
        expect(outputSuccess.mock.calls[0][0].request.body).toEqual({
          payAmount: 100,
          paidAt: "2026-03-01",
        });
      } else {
        expect(transport).toHaveBeenCalledTimes(2);
      }
    },
  );

  it("omits the quote date when mark-paid has no payment date", async () => {
    transport.mockResolvedValueOnce(unpaidLoan);
    await runMarkPaidLoan("loan_1", { dryRun: true });
    expect(transport.mock.calls[0][3]).toBeUndefined();
  });
});
