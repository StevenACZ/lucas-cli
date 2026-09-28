import { beforeEach, describe, expect, it, vi } from "vitest";

const apiRequest = vi.fn();

vi.mock("../../src/lib/api-client.js", () => ({ apiRequest }));

const { fetchAll, fetchPage, parseLimit, parseOffset } =
  await import("../../src/lib/paging.js");

function rows(count: number, start = 0) {
  return Array.from({ length: count }, (_, index) => ({ id: start + index }));
}

describe("paging", () => {
  beforeEach(() => {
    apiRequest.mockReset();
  });

  it("validates --limit and --offset", () => {
    expect(parseLimit(undefined, 50)).toBe(50);
    expect(parseLimit("100", 50)).toBe(100);
    expect(() => parseLimit("0", 50)).toThrow(/between 1 and 100/);
    expect(() => parseLimit("101", 50)).toThrow(/between 1 and 100/);
    expect(parseOffset(undefined)).toBe(0);
    expect(() => parseOffset("-1")).toThrow(/non-negative/);
  });

  it("asks one extra row below the max page size", async () => {
    apiRequest.mockResolvedValue(rows(11));

    const page = await fetchPage("/api/x", { a: "1" }, 10, 20);

    expect(apiRequest).toHaveBeenCalledWith("GET", "/api/x", undefined, {
      a: "1",
      limit: "11",
      offset: "20",
    });
    expect(page.rows).toHaveLength(10);
    expect(page.hasMore).toBe(true);
  });

  it("reports hasMore false on an exact short page", async () => {
    apiRequest.mockResolvedValue({ items: rows(10) });

    const page = await fetchPage("/api/x", {}, 10, 0);

    expect(page).toMatchObject({ hasMore: false });
    expect(page.rows).toHaveLength(10);
  });

  it("probes the next row when the limit is 100", async () => {
    apiRequest
      .mockResolvedValueOnce(rows(100))
      .mockResolvedValueOnce(rows(1, 100));

    const page = await fetchPage("/api/x", {}, 100, 0);

    expect(apiRequest).toHaveBeenLastCalledWith("GET", "/api/x", undefined, {
      limit: "1",
      offset: "100",
    });
    expect(page.hasMore).toBe(true);
  });

  it("does not probe when a 100 page comes back short", async () => {
    apiRequest.mockResolvedValueOnce(rows(99));

    const page = await fetchPage("/api/x", {}, 100, 0);

    expect(apiRequest).toHaveBeenCalledTimes(1);
    expect(page.hasMore).toBe(false);
  });

  it("fetches every page up to the cap", async () => {
    apiRequest
      .mockResolvedValueOnce(rows(100))
      .mockResolvedValueOnce(rows(100, 100))
      .mockResolvedValueOnce(rows(30, 200));

    expect(await fetchAll("/api/x", {}, 1000)).toMatchObject({
      truncated: false,
    });

    apiRequest.mockReset();
    apiRequest.mockResolvedValue(rows(100));
    const capped = await fetchAll("/api/x", {}, 150);
    expect(capped.rows).toHaveLength(150);
    expect(capped.truncated).toBe(true);
  });
});
