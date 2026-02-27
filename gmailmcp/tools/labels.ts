import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getGmailClient } from "../services/gmail.js";

export function registerLabelTools(server: McpServer): void {
  // LIST LABELS
  server.registerTool(
    "gmail_list_labels",
    {
      title: "List Gmail Labels",
      description: `List all labels in the Gmail account, including system labels (INBOX, SPAM, etc.) and user-created labels.

Returns:
  Array of labels with id, name, type (system/user), and visibility settings.

Use this to find existing label IDs before creating filters.`,
      inputSchema: z.object({}),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async () => {
      const gmail = getGmailClient();
      const res = await gmail.users.labels.list({ userId: "me" });
      const labels = res.data.labels || [];

      const formatted = labels.map((l) => ({
        id: l.id,
        name: l.name,
        type: l.type,
        messageListVisibility: l.messageListVisibility,
        labelListVisibility: l.labelListVisibility,
      }));

      const userLabels = formatted.filter((l) => l.type === "user");
      const systemLabels = formatted.filter((l) => l.type === "system");

      const text = [
        `## User Labels (${userLabels.length})`,
        ...userLabels.map((l) => `- **${l.name}** (id: \`${l.id}\`)`),
        `\n## System Labels (${systemLabels.length})`,
        ...systemLabels.map((l) => `- ${l.name} (id: \`${l.id}\`)`),
      ].join("\n");

      return {
        content: [{ type: "text", text }],
        structuredContent: { labels: formatted },
      };
    }
  );

  // CREATE LABEL
  server.registerTool(
    "gmail_create_label",
    {
      title: "Create Gmail Label",
      description: `Create a new Gmail label (folder/category).

Args:
  - name (string): Label name, e.g. "Work/Invoices" or "newsletters". Use "/" for nesting.
  - messageListVisibility (string, optional): Whether label shows in message list. "show" or "hide". Default: "show"
  - labelListVisibility (string, optional): Whether label shows in label list. "labelShow", "labelShowIfUnread", or "labelHide". Default: "labelShow"

Returns:
  Created label with its ID (needed for filter creation).

Note: Label names are case-sensitive. Nested labels use "/" separator.`,
      inputSchema: z.object({
        name: z
          .string()
          .min(1)
          .max(225)
          .describe('Label name, e.g. "Work", "newsletters", or "Work/Invoices" for nested'),
        messageListVisibility: z
          .enum(["show", "hide"])
          .default("show")
          .describe("Whether messages with this label appear in message list"),
        labelListVisibility: z
          .enum(["labelShow", "labelShowIfUnread", "labelHide"])
          .default("labelShow")
          .describe("Whether label appears in the label list sidebar"),
      }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    async ({ name, messageListVisibility, labelListVisibility }) => {
      const gmail = getGmailClient();

      const res = await gmail.users.labels.create({
        userId: "me",
        requestBody: {
          name,
          messageListVisibility,
          labelListVisibility,
        },
      });

      const label = res.data;
      const text = `✅ Label created successfully!\n- Name: **${label.name}**\n- ID: \`${label.id}\`\n\nUse this ID when creating filters.`;

      return {
        content: [{ type: "text", text }],
        structuredContent: { id: label.id, name: label.name },
      };
    }
  );

  // DELETE LABEL
  server.registerTool(
    "gmail_delete_label",
    {
      title: "Delete Gmail Label",
      description: `Delete a user-created Gmail label. System labels cannot be deleted.

Args:
  - labelId (string): The label ID to delete (get from gmail_list_labels)

Warning: This permanently deletes the label. Messages keep their content but lose this label.`,
      inputSchema: z.object({
        labelId: z
          .string()
          .min(1)
          .describe("Label ID to delete (from gmail_list_labels)"),
      }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    async ({ labelId }) => {
      const gmail = getGmailClient();
      await gmail.users.labels.delete({ userId: "me", id: labelId });

      return {
        content: [{ type: "text", text: `✅ Label \`${labelId}\` deleted successfully.` }],
        structuredContent: { deleted: true, labelId },
      };
    }
  );
}
