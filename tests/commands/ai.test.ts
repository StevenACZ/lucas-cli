import { mkdtemp, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
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
const { runInsights } = await import("../../src/commands/ai/insights.js");
const { runLucasChatMessage } =
  await import("../../src/commands/ai/chat-message.js");

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
    expect(PLAN_FEATURES.FREE).toContain("0 AI calls");
    expect(PLAN_FEATURES.FREE).toContain("Max 3 active accounts");
    expect(PLAN_FEATURES.FREE).toContain("Subscriptions blocked");
    expect(PLAN_FEATURES.PREMIUM).toContain("Unlimited accounts");
    expect(PLAN_FEATURES.PREMIUM).toContain("Unlimited subscriptions");
    expect(PLAN_FEATURES.PREMIUM).toContain(
      "AI limits: 50/day, 300/week, 1000/month",
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

    await runAIUsage({ type: "chat" });

    expect(apiRequest).toHaveBeenCalledWith("GET", "/api/ai/usage", undefined, {
      type: "chat",
    });
    expect(outputSuccess).toHaveBeenCalledWith(response);
  });

  it("posts text expense parsing requests", async () => {
    apiRequest.mockResolvedValue({ success: true, transactions: [] });

    await runParseExpenses("almuerzo 10", { date: "2026-05-08" });

    expect(apiRequest).toHaveBeenCalledWith("POST", "/api/ai/parse-expenses", {
      text: "almuerzo 10",
      date: "2026-05-08",
    });
  });

  it("posts image expense parsing requests", async () => {
    tempDir = await mkdtemp(join(tmpdir(), "lucas-cli-ai-"));
    const imagePath = join(tempDir, "receipt.jpg");
    await writeFile(imagePath, "fake-image");
    apiRequest.mockResolvedValue({ success: true, transactions: [] });

    await runParseExpensesImage([imagePath], { date: "2026-05-08" });

    expect(apiRequest).toHaveBeenCalledWith(
      "POST",
      "/api/ai/parse-expenses-image",
      {
        images: [
          {
            base64: Buffer.from("fake-image").toString("base64"),
            mimeType: "image/jpeg",
          },
        ],
        date: "2026-05-08",
      },
    );
  });

  it("posts insights requests", async () => {
    apiRequest.mockResolvedValue({ success: true, data: {} });

    await runInsights("How am I doing?", { period: "month", currency: "PEN" });

    expect(apiRequest).toHaveBeenCalledWith("POST", "/api/ai/insights", {
      query: "How am I doing?",
      period: "month",
      currency: "PEN",
    });
  });

  it("posts Lucas Chat messages", async () => {
    apiRequest.mockResolvedValue({ success: true, data: {} });

    await runLucasChatMessage("hola Lucas", { conversationId: "conv_1" });

    expect(apiRequest).toHaveBeenCalledWith("POST", "/api/lucas-chat/message", {
      message: "hola Lucas",
      conversationId: "conv_1",
    });
  });
});
