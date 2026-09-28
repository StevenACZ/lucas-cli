import { beforeEach, describe, expect, it, vi } from "vitest";

const apiRequest = vi.fn();

vi.mock("../../src/lib/api-client.js", () => ({ apiRequest }));

const {
  resetResolverCache,
  resolveAccount,
  resolveAccountId,
  resolveCategory,
  resolveCategoryFilterIds,
} = await import("../../src/lib/resolve.js");

const accounts = [
  { id: "acc_1", name: "ITK Soles", bank: "Interbank", currency: "PEN" },
  { id: "acc_2", name: "ITK Dólares", bank: "Interbank", currency: "USD" },
  { id: "acc_3", name: "Visa Signature", bank: "BCP", currency: "PEN" },
];

const categories = [
  {
    id: "cat_food_default",
    name: "Food",
    slug: "food",
    type: "EXPENSE",
    isDefault: true,
  },
  { id: "cat_food_custom", name: "Food", slug: "food-2", type: "EXPENSE" },
  {
    id: "cat_salary",
    name: "Salario",
    slug: "salary",
    type: "INCOME",
    isDefault: true,
  },
];

let lastUse: Record<string, string> = {};

beforeEach(() => {
  resetResolverCache();
  lastUse = {};
  apiRequest.mockReset();
  apiRequest.mockImplementation(
    async (
      _method: string,
      path: string,
      _body: unknown,
      query?: Record<string, string>,
    ) => {
      if (path === "/api/accounts") return { accounts };
      if (path === "/api/categories") return categories;
      if (path === "/api/transactions") {
        const date = lastUse[query?.categoryIds ?? ""];
        return { items: date ? [{ date }] : [] };
      }
      throw new Error(`Unexpected ${path}`);
    },
  );
});

describe("resolve accounts", () => {
  it("matches the exact name ignoring accents and case", async () => {
    expect((await resolveAccount("itk dolares")).id).toBe("acc_2");
  });

  it("matches bank plus name", async () => {
    expect((await resolveAccount("BCP Visa Signature")).id).toBe("acc_3");
  });

  it("falls back to a unique partial match", async () => {
    expect((await resolveAccount("visa")).id).toBe("acc_3");
  });

  it("lists candidates when a partial match is ambiguous", async () => {
    await expect(resolveAccount("ITK")).rejects.toMatchObject({
      code: "AMBIGUOUS",
      details: {
        candidates: [
          expect.objectContaining({ id: "acc_1" }),
          expect.objectContaining({ id: "acc_2" }),
        ],
      },
    });
  });

  it("reports NOT_FOUND with the available names", async () => {
    await expect(resolveAccount("Scotiabank")).rejects.toMatchObject({
      code: "NOT_FOUND",
      exitCode: 4,
      details: { available: ["ITK Soles", "ITK Dólares", "Visa Signature"] },
    });
  });

  it("passes known and id-shaped ids through", async () => {
    expect(await resolveAccountId("acc_1")).toBe("acc_1");
    expect(await resolveAccountId("cm1abcdefghijklmnopqrstuv")).toBe(
      "cm1abcdefghijklmnopqrstuv",
    );
    expect(await resolveAccountId(undefined)).toBeUndefined();
  });

  it("loads the account list once per process", async () => {
    await resolveAccount("ITK Soles");
    await resolveAccount("Visa");
    expect(apiRequest).toHaveBeenCalledTimes(1);
  });
});

describe("resolve categories", () => {
  it("filters by type before matching", async () => {
    expect((await resolveCategory("sal", "INCOME")).id).toBe("cat_salary");
  });

  it("breaks a same-name tie by the most recently used copy", async () => {
    lastUse = {
      cat_food_default: "2026-08-01T17:00:00.000Z",
      cat_food_custom: "2026-09-01T17:00:00.000Z",
    };
    expect((await resolveCategory("food", "EXPENSE")).id).toBe(
      "cat_food_custom",
    );
  });

  it("prefers the default copy when none was used", async () => {
    expect((await resolveCategory("Food")).id).toBe("cat_food_default");
  });

  it("keeps every same-name copy for list filters", async () => {
    expect(await resolveCategoryFilterIds("food")).toBe(
      "cat_food_default,cat_food_custom",
    );
  });
});
