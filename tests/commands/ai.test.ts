import { mkdtemp, readFile, readdir, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join, relative } from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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

const { AI_IMAGE_LIMIT, PLAN_FEATURES, USER_PLANS, assertImageLimit } =
  await import("../../src/lib/ai-contract.js");
const { runAIUsage } = await import("../../src/commands/ai/usage.js");
const { runParseExpenses } =
  await import("../../src/commands/ai/parse-expenses.js");
const { runParseExpensesImage } =
  await import("../../src/commands/ai/parse-expenses-image.js");

async function listFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) return listFiles(path);
      return [path];
    }),
  );
  return files.flat();
}

describe("ai commands", () => {
  let tempDir: string | undefined;

  beforeEach(() => {
    apiRequest.mockReset();
    outputSuccess.mockReset();
    outputError.mockClear();
  });

  afterEach(async () => {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
      tempDir = undefined;
    }
  });

  it("exposes only FREE and PREMIUM plan copy", () => {
    expect(USER_PLANS).toEqual(["FREE", "PREMIUM"]);
    expect(PLAN_FEATURES.FREE).toContain("40 AI actions/month");
    expect(PLAN_FEATURES.FREE).toContain("Max 3 active accounts");
    expect(PLAN_FEATURES.FREE).toContain("Subscriptions blocked");
    expect(PLAN_FEATURES.PREMIUM).toContain("Unlimited accounts");
    expect(PLAN_FEATURES.PREMIUM).toContain("Subscriptions");
    expect(PLAN_FEATURES.PREMIUM).toContain(
      "AI limits: 80/day, 250/week, 400/month",
    );
  });

  it("keeps receipt image requests capped at 10 files", () => {
    expect(AI_IMAGE_LIMIT).toBe(10);
    expect(() => assertImageLimit(Array.from({ length: 10 }))).not.toThrow();
    expect(() => assertImageLimit(Array.from({ length: 11 }))).toThrow(
      "Maximum 10 images per request",
    );
  });

  it("calls the AI usage endpoint and preserves usagePeriods", async () => {
    const response = {
      success: true,
      usage: {
        plan: "PREMIUM",
        callsToday: 1,
        limit: 50,
        remaining: 49,
        usagePeriods: {
          daily: { used: 1, limit: 50, remaining: 49 },
          weekly: { used: 7, limit: 300, remaining: 293 },
          monthly: { used: 20, limit: 1000, remaining: 980 },
        },
      },
    };
    apiRequest.mockResolvedValue(response);

    await runAIUsage({ type: "lite" });

    expect(apiRequest).toHaveBeenCalledWith("GET", "/api/ai/usage", undefined, {
      type: "lite",
    });
    expect(outputSuccess).toHaveBeenCalledWith(response);
  });

  it("posts text expense parsing requests with optional account context", async () => {
    apiRequest.mockResolvedValue({ success: true, transactions: [] });

    await runParseExpenses("almuerzo 10", {
      date: "2026-05-08",
      accountId: "account-1",
    });

    expect(apiRequest).toHaveBeenCalledWith("POST", "/api/ai/parse-expenses", {
      text: "almuerzo 10",
      date: "2026-05-08",
      accountId: "account-1",
    });
  });

  it("posts image expense parsing requests with optional account context", async () => {
    tempDir = await mkdtemp(join(tmpdir(), "lucas-cli-ai-"));
    const imagePath = join(tempDir, "receipt.jpg");
    const jpegBytes = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
    await writeFile(imagePath, jpegBytes);
    apiRequest.mockResolvedValue({ success: true, transactions: [] });

    await runParseExpensesImage([imagePath], {
      date: "2026-05-08",
      accountId: "account-1",
    });

    expect(apiRequest).toHaveBeenCalledWith(
      "POST",
      "/api/ai/parse-expenses-image",
      {
        images: [
          {
            base64: jpegBytes.toString("base64"),
            mimeType: "image/jpeg",
          },
        ],
        date: "2026-05-08",
        accountId: "account-1",
      },
    );
  });

  it("rejects non-image files before sending them to the backend", async () => {
    tempDir = await mkdtemp(join(tmpdir(), "lucas-cli-ai-"));
    const credentialsPath = join(tempDir, "credentials.json");
    await writeFile(credentialsPath, JSON.stringify({ token: "secret" }));

    await expect(runParseExpensesImage([credentialsPath], {})).rejects.toThrow(
      "Refusing to read sensitive file",
    );

    expect(apiRequest).not.toHaveBeenCalled();
  });

  it("does not ship retired chat or insights commands/endpoints", async () => {
    const sourceFiles = await listFiles(join(process.cwd(), "src"));
    const matches: string[] = [];

    for (const file of sourceFiles) {
      if (!file.endsWith(".ts")) continue;
      const text = await readFile(file, "utf8");
      if (
        /chat-message|lucas-chat|Lucas Chat|ai\/insights|runInsights/i.test(
          text,
        )
      ) {
        matches.push(relative(process.cwd(), file));
      }
    }

    expect(matches).toEqual([]);
  });
});
