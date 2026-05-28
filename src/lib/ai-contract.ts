import { lstat, readFile, stat } from "fs/promises";
import { homedir } from "os";
import { basename, extname, join, resolve, sep } from "path";

export const USER_PLANS = ["FREE", "PREMIUM"] as const;
export type UserPlan = (typeof USER_PLANS)[number];

export const AI_IMAGE_LIMIT = 10;
export const AI_IMAGE_MAX_BYTES = 10 * 1024 * 1024;
const AI_IMAGE_TOTAL_MAX_BYTES = 25 * 1024 * 1024;

export const PLAN_FEATURES: Record<UserPlan, string[]> = {
  FREE: [
    "40 AI actions/month",
    "Max 3 active accounts",
    "Subscriptions and investments blocked",
  ],
  PREMIUM: [
    "Unlimited accounts",
    "Subscriptions and investments",
    "AI limits: 80/day, 250/week, 400/month",
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

type SupportedImageMimeType =
  | "image/jpeg"
  | "image/png"
  | "image/webp"
  | "image/heic";

export function mimeTypeForPath(filePath: string): SupportedImageMimeType {
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
      throw new Error("Only JPG, PNG, WebP, or HEIC images are supported");
  }
}

function isUnderPath(candidate: string, parent: string): boolean {
  const normalizedParent = parent.endsWith(sep) ? parent : `${parent}${sep}`;
  return candidate === parent || candidate.startsWith(normalizedParent);
}

function assertNotSensitivePath(filePath: string): void {
  const resolved = resolve(filePath);
  const home = homedir();
  const sensitiveParents = [
    join(home, ".ssh"),
    join(home, ".gnupg"),
    join(home, ".aws"),
    join(home, ".config", "lucas"),
  ];
  const sensitiveNames = new Set([
    ".env",
    ".env.local",
    ".npmrc",
    "credentials.json",
    "id_rsa",
    "id_dsa",
    "id_ecdsa",
    "id_ed25519",
  ]);
  const name = basename(resolved).toLowerCase();

  if (
    sensitiveParents.some((parent) => isUnderPath(resolved, parent)) ||
    sensitiveNames.has(name) ||
    name.startsWith(".env.")
  ) {
    throw new Error("Refusing to read sensitive file");
  }
}

function hasExpectedMagicBytes(
  bytes: Buffer,
  mimeType: SupportedImageMimeType,
): boolean {
  if (mimeType === "image/jpeg") {
    return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }

  if (mimeType === "image/png") {
    return (
      bytes.length >= 8 &&
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47 &&
      bytes[4] === 0x0d &&
      bytes[5] === 0x0a &&
      bytes[6] === 0x1a &&
      bytes[7] === 0x0a
    );
  }

  if (mimeType === "image/webp") {
    return (
      bytes.length >= 12 &&
      bytes.subarray(0, 4).toString("ascii") === "RIFF" &&
      bytes.subarray(8, 12).toString("ascii") === "WEBP"
    );
  }

  if (mimeType === "image/heic") {
    const brand = bytes.subarray(4, 32).toString("ascii");
    return (
      brand.includes("ftyp") && /(heic|heix|hevc|hevx|mif1|msf1)/.test(brand)
    );
  }

  return false;
}

async function readValidatedImage(filePath: string): Promise<AIImagePayload> {
  assertNotSensitivePath(filePath);

  const linkInfo = await lstat(filePath);
  if (linkInfo.isSymbolicLink()) {
    throw new Error("Refusing to read symlink image path");
  }

  const fileInfo = await stat(filePath);
  if (!fileInfo.isFile()) {
    throw new Error("Image path must be a regular file");
  }
  if (fileInfo.size > AI_IMAGE_MAX_BYTES) {
    throw new Error(
      `Image exceeds maximum size of ${AI_IMAGE_MAX_BYTES} bytes`,
    );
  }

  const mimeType = mimeTypeForPath(filePath);
  const bytes = await readFile(filePath);
  if (!hasExpectedMagicBytes(bytes, mimeType)) {
    throw new Error("Image file content does not match its extension");
  }

  return {
    base64: bytes.toString("base64"),
    mimeType,
  };
}

export async function readImagePayloads(
  paths: string[],
): Promise<AIImagePayload[]> {
  assertImageLimit(paths);

  let totalBytes = 0;
  for (const path of paths) {
    assertNotSensitivePath(path);
    const linkInfo = await lstat(path);
    if (linkInfo.isSymbolicLink()) {
      throw new Error("Refusing to read symlink image path");
    }
    const fileInfo = await stat(path);
    totalBytes += fileInfo.size;
    if (totalBytes > AI_IMAGE_TOTAL_MAX_BYTES) {
      throw new Error(
        `Images exceed total maximum size of ${AI_IMAGE_TOTAL_MAX_BYTES} bytes`,
      );
    }
  }

  const images = await Promise.all(paths.map(readValidatedImage));

  return images;
}
