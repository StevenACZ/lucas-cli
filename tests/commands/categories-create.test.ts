import { beforeEach, describe, expect, it, vi } from "vitest";

const apiRequest = vi.fn();
const success = vi.fn();

vi.mock("../../src/lib/api-client.js", () => ({ apiRequest }));
vi.mock("../../src/lib/output.js", () => ({
  output: { success, error: vi.fn() },
}));

async function runCreate(args: string[]) {
  vi.resetModules();
  const { createCategoryCommand } =
    await import("../../src/commands/categories/create.js");
  await createCategoryCommand.parseAsync(args, { from: "user" });
}

const ARGS = ["--name", "Pets", "--icon", "paw", "--color", "#F59E0B"];
const BODY = { name: "Pets", icon: "paw", color: "#F59E0B" };

describe("categories create", () => {
  beforeEach(() => {
    apiRequest.mockReset();
    success.mockReset();
  });

  it("posts the category and prints the compact view", async () => {
    apiRequest.mockResolvedValue({
      id: "cat_1",
      ...BODY,
      isDefault: false,
      userId: "user_1",
    });

    await runCreate(ARGS);

    expect(apiRequest).toHaveBeenCalledWith("POST", "/api/categories", BODY);
    expect(success).toHaveBeenCalledWith({
      category: { id: "cat_1", name: "Pets", custom: true },
    });
  });

  it("rejects a color that is not #RRGGBB", async () => {
    vi.resetModules();
    const { createCategoryCommand } =
      await import("../../src/commands/categories/create.js");
    createCategoryCommand.exitOverride();

    await expect(
      createCategoryCommand.parseAsync(
        ["--name", "Pets", "--icon", "paw", "--color", "orange"],
        { from: "user" },
      ),
    ).rejects.toMatchObject({ code: "commander.invalidArgument" });
    expect(apiRequest).not.toHaveBeenCalled();
  });

  it("--dry-run prints the request and writes nothing", async () => {
    await runCreate([...ARGS, "--dry-run"]);

    expect(apiRequest).not.toHaveBeenCalled();
    expect(success).toHaveBeenCalledWith({
      dryRun: true,
      request: { method: "POST", path: "/api/categories", body: BODY },
    });
  });
});
