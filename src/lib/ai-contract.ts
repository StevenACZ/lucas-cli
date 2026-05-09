import { readFile } from "fs/promises";
import { extname } from "path";

export const USER_PLANS = ["FREE", "PREMIUM"] as const;
export type UserPlan = (typeof USER_PLANS)[number];

export const AI_IMAGE_LIMIT = 10;

export const PLAN_FEATURES: Record<UserPlan, string[]> = {
  FREE: ["0 AI calls", "Max 3 active accounts", "Subscriptions blocked"],
  PREMIUM: [
    "Unlimited accounts",
    "Unlimited subscriptions",
    "AI limits: 50/day, 300/week, 1000/month",
  ],
};

export interface AIImagePayload {
  base64: string;
  mimeType: string;
}

export function assertImageLimit(images: ArrayLike<unknown>): void {
  if (images.length > AI_IMAGE_LIMIT) {
    throw new Error(`Maximum ${AI_IMAGE_LIMIT} images per request`);
  }
}

export function mimeTypeForPath(filePath: string): string {
  switch (extname(filePath).toLowerCase()) {
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".png":
      return "image/png";
    case ".webp":
      return "image/webp";
    case ".heic":
      return "image/heic";
    default:
      return "application/octet-stream";
  }
}

export async function readImagePayloads(
  paths: string[],
): Promise<AIImagePayload[]> {
  assertImageLimit(paths);

  const images = await Promise.all(
    paths.map(async (path) => ({
      base64: (await readFile(path)).toString("base64"),
      mimeType: mimeTypeForPath(path),
    })),
  );

  return images;
}
