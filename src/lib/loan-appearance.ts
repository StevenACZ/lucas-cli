import { lstat, readFile } from "node:fs/promises";
import { InvalidArgumentError } from "commander";
import { assertNotSensitivePath } from "./ai-contract.js";
import { CliError, invalidValue } from "./errors.js";

export const LOAN_ICONS: readonly { name: string; color: string }[] = [
  { name: "cash", color: "#22C55E" },
  { name: "card", color: "#D14A4A" },
  { name: "bank", color: "#64748B" },
  { name: "family", color: "#EC4899" },
  { name: "friend", color: "#2563EB" },
  { name: "home", color: "#14B8A6" },
  { name: "car", color: "#F59E0B" },
  { name: "motorcycle", color: "#EA580C" },
  { name: "computer", color: "#3B82F6" },
  { name: "phone", color: "#0EA5E9" },
  { name: "appliance", color: "#0891B2" },
  { name: "tv", color: "#4F46E5" },
  { name: "furniture", color: "#B45309" },
  { name: "renovation", color: "#CA8A04" },
  { name: "education", color: "#8B5CF6" },
  { name: "health", color: "#10B981" },
  { name: "business", color: "#6366F1" },
  { name: "travel", color: "#0EA5E9" },
  { name: "shopping", color: "#F97316" },
  { name: "clothing", color: "#E11D48" },
  { name: "event", color: "#DB2777" },
  { name: "gift", color: "#EF4444" },
  { name: "baby", color: "#38BDF8" },
  { name: "pet", color: "#D97706" },
  { name: "gaming", color: "#A855F7" },
  { name: "music", color: "#9333EA" },
  { name: "sport", color: "#DC2626" },
  { name: "bike", color: "#16A34A" },
  { name: "camera", color: "#06B6D4" },
  { name: "jewelry", color: "#7C3AED" },
  { name: "equipment", color: "#84CC16" },
  { name: "services", color: "#EAB308" },
];

export const LOAN_ICON_NAMES = LOAN_ICONS.map((icon) => icon.name);

export const LOAN_IMAGE_MAX_BYTES = 256 * 1024;
export const LOAN_IMAGE_MAX_SIDE = 1024;

const IMAGE_HINT =
  "Use a JPEG of at most 256 KB and 1024 px per side, e.g. sips -Z 1024 -s format jpeg photo.png --out photo.jpg";

const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/;

export function hexColor(value: string): string {
  const color = value.trim();
  if (!HEX_COLOR.test(color)) throw new InvalidArgumentError("Use #RRGGBB.");
  return color.toUpperCase();
}

function imageError(message: string, details?: unknown): CliError {
  return new CliError({
    code: "INVALID_VALUE",
    message,
    hint: IMAGE_HINT,
    details,
  });
}

export async function readLoanImage(
  filePath: string,
): Promise<{ imageBase64: string; imageMimeType: "image/jpeg" }> {
  try {
    assertNotSensitivePath(filePath);
  } catch {
    throw invalidValue("--image refuses to read a sensitive file");
  }
  const info = await lstat(filePath).catch(() => null);
  if (!info || !info.isFile()) {
    throw imageError("--image must be a regular file", { path: filePath });
  }
  if (info.size > LOAN_IMAGE_MAX_BYTES) {
    throw imageError(`--image exceeds ${LOAN_IMAGE_MAX_BYTES} bytes`, {
      bytes: info.size,
    });
  }
  const bytes = await readFile(filePath);
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[2] !== 0xff) {
    throw imageError("--image must be a JPEG");
  }
  const size = jpegSize(bytes);
  if (size && Math.max(size.width, size.height) > LOAN_IMAGE_MAX_SIDE) {
    throw imageError(
      `--image exceeds ${LOAN_IMAGE_MAX_SIDE} px on its longest side`,
      size,
    );
  }
  return { imageBase64: bytes.toString("base64"), imageMimeType: "image/jpeg" };
}

function jpegSize(bytes: Buffer): { width: number; height: number } | null {
  let offset = 2;
  while (offset + 9 < bytes.length && bytes[offset] === 0xff) {
    const marker = bytes[offset + 1];
    if (marker === 0xff) {
      offset += 1;
      continue;
    }
    const isFrame =
      marker >= 0xc0 &&
      marker <= 0xcf &&
      marker !== 0xc4 &&
      marker !== 0xc8 &&
      marker !== 0xcc;
    if (isFrame) {
      return {
        height: bytes.readUInt16BE(offset + 5),
        width: bytes.readUInt16BE(offset + 7),
      };
    }
    offset += 2 + bytes.readUInt16BE(offset + 2);
  }
  return null;
}

export interface LoanAppearanceOptions {
  icon?: string;
  color?: string;
  clearIcon?: boolean;
  image?: string;
  clearImage?: boolean;
}

export async function loanAppearanceBody(
  opts: LoanAppearanceOptions,
): Promise<Record<string, unknown>> {
  if (opts.icon && opts.clearIcon) {
    throw invalidValue("Use --icon or --clear-icon, not both");
  }
  if (opts.image && opts.clearImage) {
    throw invalidValue("Use --image or --clear-image, not both");
  }
  const body: Record<string, unknown> = {};
  if (opts.clearIcon) {
    body.iconName = null;
    body.iconColorHex = null;
  }
  if (opts.icon) {
    body.iconName = opts.icon;
    body.iconColorHex =
      opts.color ?? LOAN_ICONS.find((icon) => icon.name === opts.icon)?.color;
  } else if (opts.color) {
    body.iconColorHex = opts.color;
  }
  if (opts.clearImage) body.imageBase64 = null;
  if (opts.image) Object.assign(body, await readLoanImage(opts.image));
  return body;
}

export function withoutImageData(
  body: Record<string, unknown>,
): Record<string, unknown> {
  if (typeof body.imageBase64 !== "string") return body;
  const bytes = Buffer.from(body.imageBase64, "base64").length;
  return { ...body, imageBase64: `<jpeg, ${bytes} bytes>` };
}
