import { Command } from "commander";
import { buildBody } from "../../lib/body-builder.js";
import { apiRequest } from "../../lib/api-client.js";
import { output } from "../../lib/output.js";
import { resourcePath } from "../../lib/resource-path.js";

interface ReorderOptions {
  ids: string;
}

export function parseGroupIds(value: string): string[] {
  return value
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
}

export const subscriptionGroupsCommand = new Command(
  "subscription-groups",
).description("Manage subscription groups");

subscriptionGroupsCommand
  .command("list")
  .description("List subscription groups")
  .action(async () => {
    const data = await apiRequest("GET", "/api/subscription-groups");
    output.success(data);
  });

subscriptionGroupsCommand
  .command("create")
  .description("Create a subscription group")
  .requiredOption("--name <name>", "Group name")
  .option("--color <hex>", "Group color (#RRGGBB)")
  .option("--icon <icon>", "Group icon")
  .action(async (opts) => {
    const body = buildBody(opts, [
      { opt: "name", body: "name" },
      { opt: "color", body: "color" },
      { opt: "icon", body: "icon" },
    ]);
    const data = await apiRequest("POST", "/api/subscription-groups", body);
    output.success(data);
  });

subscriptionGroupsCommand
  .command("update")
  .description("Update a subscription group")
  .argument("<id>", "Subscription group ID")
  .option("--name <name>", "Group name")
  .option("--color <hex>", "Group color (#RRGGBB)")
  .option("--clear-color", "Clear group color")
  .option("--icon <icon>", "Group icon")
  .option("--clear-icon", "Clear group icon")
  .option("--display-order <n>", "Display order")
  .action(async (id: string, opts) => {
    const body = buildBody(opts, [
      { opt: "name", body: "name" },
      { opt: "color", body: "color", clearOpt: "clearColor" },
      { opt: "icon", body: "icon", clearOpt: "clearIcon" },
      { opt: "displayOrder", body: "displayOrder", type: "number" },
    ]);
    const data = await apiRequest(
      "PUT",
      resourcePath("/api/subscription-groups", id),
      body,
    );
    output.success(data);
  });

subscriptionGroupsCommand
  .command("delete")
  .description("Delete a subscription group")
  .argument("<id>", "Subscription group ID")
  .action(async (id: string) => {
    const data = await apiRequest(
      "DELETE",
      resourcePath("/api/subscription-groups", id),
    );
    output.success(data);
  });

subscriptionGroupsCommand
  .command("reorder")
  .description("Reorder subscription groups")
  .requiredOption("--ids <ids>", "Comma-separated group IDs in display order")
  .action(async (opts: ReorderOptions) => {
    const data = await apiRequest("POST", "/api/subscription-groups/reorder", {
      ids: parseGroupIds(opts.ids),
    });
    output.success(data);
  });
