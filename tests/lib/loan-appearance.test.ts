import { mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  hexColor,
  loanAppearanceBody,
  LOAN_ICONS,
  LOAN_IMAGE_MAX_BYTES,
  readLoanImage,
  withoutImageData,
} from "../../src/lib/loan-appearance.js";

const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]);
function jpegOfSize(width: number, height: number): Buffer {
  const frame = Buffer.from([0xff, 0xc0, 0x00, 0x11, 0x08, 0, 0, 0, 0, 0x03]);
  frame.writeUInt16BE(height, 5);
  frame.writeUInt16BE(width, 7);
  return Buffer.concat([
    Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x04, 0x4a, 0x46]),
    frame,
    Buffer.alloc(16),
  ]);
}
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

let dir: string;

beforeAll(async () => {
  dir = await mkdtemp(join(tmpdir(), "lucas-loan-image-"));
  await writeFile(join(dir, "photo.jpg"), JPEG);
  await writeFile(join(dir, "photo.png"), PNG);
  await writeFile(
    join(dir, "big.jpg"),
    Buffer.concat([JPEG, Buffer.alloc(LOAN_IMAGE_MAX_BYTES)]),
  );
  await writeFile(join(dir, "square.jpg"), jpegOfSize(1024, 1024));
  await writeFile(join(dir, "wide.jpg"), jpegOfSize(1400, 700));
  await writeFile(join(dir, ".env"), JPEG);
  await symlink(join(dir, "photo.jpg"), join(dir, "link.jpg"));
});

afterAll(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("loan appearance", () => {
  it("lists 32 unique icons with a color each", () => {
    expect(LOAN_ICONS).toHaveLength(32);
    expect(new Set(LOAN_ICONS.map((icon) => icon.name)).size).toBe(32);
    for (const icon of LOAN_ICONS)
      expect(hexColor(icon.color)).toBe(icon.color);
  });

  it("gives an icon its own color unless one is passed", async () => {
    expect(await loanAppearanceBody({ icon: "car" })).toEqual({
      iconName: "car",
      iconColorHex: "#F59E0B",
    });
    expect(await loanAppearanceBody({ icon: "car", color: "#112233" })).toEqual(
      { iconName: "car", iconColorHex: "#112233" },
    );
    expect(await loanAppearanceBody({ color: "#112233" })).toEqual({
      iconColorHex: "#112233",
    });
  });

  it("clears the icon with its color, and the photo", async () => {
    expect(
      await loanAppearanceBody({ clearIcon: true, clearImage: true }),
    ).toEqual({ iconName: null, iconColorHex: null, imageBase64: null });
  });

  it("rejects a value together with its clear flag", async () => {
    await expect(
      loanAppearanceBody({ icon: "car", clearIcon: true }),
    ).rejects.toMatchObject({ code: "INVALID_VALUE" });
    await expect(
      loanAppearanceBody({ image: "x.jpg", clearImage: true }),
    ).rejects.toMatchObject({ code: "INVALID_VALUE" });
  });

  it("normalises a hex color and rejects anything else", () => {
    expect(hexColor("#ea580c")).toBe("#EA580C");
    expect(() => hexColor("orange")).toThrow("Use #RRGGBB.");
  });

  it("reads a JPEG as base64", async () => {
    expect(await loanAppearanceBody({ image: join(dir, "photo.jpg") })).toEqual(
      { imageBase64: JPEG.toString("base64"), imageMimeType: "image/jpeg" },
    );
  });

  it("rejects a non-JPEG, an oversized file, a symlink, a missing file and a sensitive name", async () => {
    for (const name of [
      "photo.png",
      "big.jpg",
      "link.jpg",
      "none.jpg",
      ".env",
    ]) {
      await expect(readLoanImage(join(dir, name))).rejects.toMatchObject({
        code: "INVALID_VALUE",
      });
    }
  });

  it("accepts 1024 px per side and rejects a longer side", async () => {
    await expect(readLoanImage(join(dir, "square.jpg"))).resolves.toMatchObject(
      { imageMimeType: "image/jpeg" },
    );
    await expect(readLoanImage(join(dir, "wide.jpg"))).rejects.toMatchObject({
      code: "INVALID_VALUE",
      details: { width: 1400, height: 700 },
    });
  });

  it("keeps image data out of a printed request", () => {
    expect(
      withoutImageData({ name: "Car", imageBase64: JPEG.toString("base64") }),
    ).toEqual({ name: "Car", imageBase64: "<jpeg, 8 bytes>" });
    expect(withoutImageData({ imageBase64: null })).toEqual({
      imageBase64: null,
    });
  });
});
