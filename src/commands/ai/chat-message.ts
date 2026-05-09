import { Command } from "commander";
import { apiRequest } from "../../lib/api-client.js";
import { output } from "../../lib/output.js";

interface LucasChatMessageOptions {
  conversationId?: string;
}

export async function runLucasChatMessage(
  message: string,
  opts: LucasChatMessageOptions,
) {
  const body: Record<string, unknown> = { message };
  if (opts.conversationId) body.conversationId = opts.conversationId;

  const data = await apiRequest("POST", "/api/lucas-chat/message", body);
  output.success(data);
}

export const lucasChatMessageCommand = new Command("chat-message")
  .description("Send a message to Lucas Chat")
  .argument("<message...>", "Message for Lucas Chat")
  .option("--conversation-id <id>", "Existing conversation ID")
  .action(async (messageParts: string[], opts: LucasChatMessageOptions) => {
    const message = messageParts.join(" ").trim();
    if (!message) {
      output.error("Message is required");
    }

    await runLucasChatMessage(message, opts);
  });
