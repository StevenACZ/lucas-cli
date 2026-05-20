import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";
import { CLI_VERSION } from "../../src/lib/version.js";

describe("CLI version", () => {
  it("matches package.json", () => {
    const packageJson = JSON.parse(
      readFileSync(join(process.cwd(), "package.json"), "utf8"),
    ) as { version: string };

    expect(CLI_VERSION).toBe(packageJson.version);
  });
});
