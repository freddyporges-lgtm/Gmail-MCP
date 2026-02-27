import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getGmailClient } from "../services/gmail.js";

export function registerFilterTools(server: McpServer): void {
  // LIST FILTERS
  server.registerTool(
    "gmail_list_filters",
    {
      title: "List Gmail Filters",
      description: `List all existing Gmail filters/rules.

Returns:
  Array of filters with their criteria (from, to, subject, query, etc.) and actions (apply label, skip inbox, mark read, etc.).

Use this to see what filters already exist before creating new ones.`,
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
      const res = await gmail.users.settings.filters.list({ userId: "me" });
      const filters = res.data.filter || [];

      if (filters.length === 0) {
        return {
          content: [{ type: "text", text: "No filters found in this Gmail account." }],
          structuredContent: { filters: [] },
        };
      }

      const lines = filters.map((f, i) => {
        const criteria = f.criteria || {};
        const action = f.action || {};
        const criteriaStr = [
          criteria.from && `from: ${criteria.from}`,
          criteria.to && `to: ${criteria.to}`,
          criteria.subject && `subject: ${criteria.subject}`,
          criteria.query && `query: ${criteria.query}`,
          criteria.hasAttachment && `has attachment`,
          criteria.excludeChats && `exclude chats`,
        ]
          .filter(Boolean)
          .join(", ");

        const actionStr = [
          ...(action.addLabelIds || []).map((id: string) => `add label: ${id}`),
          ...(action.removeLabelIds || []).map((id: string) => `remove label: ${id}`),
        ].join(", ");

        return `**Filter ${i + 1}** (id: \`${f.id}\`)\n  Criteria: ${criteriaStr || "none"}\n  Actions: ${actionStr || "none"}`;
      });

      return {
        content: [{ type: "text", text: `## Gmail Filters (${filters.length})\n\n` + lines.join("\n\n") }],
        structuredContent: { filters },
      };
    }
  );

  // CREATE FILTER
  server.registerTool(
    "gmail_create_filter",
    {
      title: "Create Gmail Filter",
      description: `Create a new Gmail filter rule that automatically processes incoming emails.

Criteria args (at least one required):
  - from (string, optional): Filter emails from this sender. Supports wildcards, e.g. "@company.com"
  - to (string, optional): Filter emails sent to this address
  - subject (string, optional): Filter emails containing this in the subject
  - query (string, optional): Gmail search query string, e.g. "newsletter OR unsubscribe"
  - hasAttachment (boolean, optional): Filter emails that have attachments
  - excludeChats (boolean, optional): Exclude Google Chat messages from filter

Action args (at least one required):
  - addLabelIds (string[], optional): Label IDs to apply. Use "INBOX", "SPAM", "TRASH", or custom label IDs from gmail_list_labels
  - removeLabelIds (string[], optional): Label IDs to remove. Use "INBOX" to skip inbox (archive), "UNREAD" to mark as read

Common patterns:
  - Archive + label newsletter: removeLabelIds=["INBOX"], addLabelIds=["<your-label-id>"]
  - Mark as read: removeLabelIds=["UNREAD"]
  - Move to spam: addLabelIds=["SPAM"]
  - Star important emails: addLabelIds=["STARRED"]

Returns:
  Created filter with its ID.`,
      inputSchema: z.object({
        from: z.string().optional().describe('Filter emails from this sender, e.g. "boss@company.com" or "@newsletters.com"'),
        to: z.string().optional().describe("Filter emails sent to this address"),
        subject: z.string().optional().describe("Filter emails with this text in subject"),
        query: z.string().optional().describe('Gmail search query, e.g. "newsletter OR unsubscribe"'),
        hasAttachment: z.boolean().optional().describe("Filter emails with attachments"),
        excludeChats: z.boolean().optional().describe("Exclude Google Chat messages"),
        addLabelIds: z
          .array(z.string())
          .optional()
          .describe('Label IDs to add, e.g. ["INBOX", "Label_123"] or custom label IDs'),
        removeLabelIds: z
          .array(z.string())
          .optional()
          .describe('Label IDs to remove, e.g. ["INBOX"] to archive, ["UNREAD"] to mark as read'),
      }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    async ({ from, to, subject, query, hasAttachment, excludeChats, addLabelIds, removeLabelIds }) => {
      // Validate at least one criteria
      if (!from && !to && !subject && !query && hasAttachment === undefined && excludeChats === undefined) {
        throw new Error("At least one filter criteria is required (from, to, subject, query, hasAttachment, or excludeChats).");
      }

      // Validate at least one action
      if ((!addLabelIds || addLabelIds.length === 0) && (!removeLabelIds || removeLabelIds.length === 0)) {
        throw new Error("At least one action is required (addLabelIds or removeLabelIds).");
      }

      const gmail = getGmailClient();

      const criteria: Record<string, unknown> = {};
      if (from) criteria.from = from;
      if (to) criteria.to = to;
      if (subject) criteria.subject = subject;
      if (query) criteria.query = query;
      if (hasAttachment !== undefined) criteria.hasAttachment = hasAttachment;
      if (excludeChats !== undefined) criteria.excludeChats = excludeChats;

      const action: Record<string, unknown> = {};
      if (addLabelIds && addLabelIds.length > 0) action.addLabelIds = addLabelIds;
      if (removeLabelIds && removeLabelIds.length > 0) action.removeLabelIds = removeLabelIds;

      const res = await gmail.users.settings.filters.create({
        userId: "me",
        requestBody: { criteria, action },
      });

      const filter = res.data;

      const criteriaDesc = Object.entries(criteria)
        .map(([k, v]) => `${k}: ${v}`)
        .join(", ");
      const actionDesc = [
        ...(addLabelIds || []).map((id) => `add label "${id}"`),
        ...(removeLabelIds || []).map((id) => `remove label "${id}"`),
      ].join(", ");

      const text = `✅ Filter created successfully!\n- ID: \`${filter.id}\`\n- Criteria: ${criteriaDesc}\n- Actions: ${actionDesc}`;

      return {
        content: [{ type: "text", text }],
        structuredContent: { id: filter.id, criteria, action },
      };
    }
  );

  // DELETE FILTER
  server.registerTool(
    "gmail_delete_filter",
    {
      title: "Delete Gmail Filter",
      description: `Delete an existing Gmail filter rule.

Args:
  - filterId (string): The filter ID to delete (get from gmail_list_filters)

Warning: This permanently deletes the filter. Existing emails are not affected, only future emails.`,
      inputSchema: z.object({
        filterId: z.string().min(1).describe("Filter ID to delete (from gmail_list_filters)"),
      }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    async ({ filterId }) => {
      const gmail = getGmailClient();
      await gmail.users.settings.filters.delete({ userId: "me", id: filterId });

      return {
        content: [{ type: "text", text: `✅ Filter \`${filterId}\` deleted successfully.` }],
        structuredContent: { deleted: true, filterId },
      };
    }
  );

  // BULK CREATE FILTERS
  server.registerTool(
    "gmail_bulk_create_filters",
    {
      title: "Bulk Create Gmail Filters",
      description: `Create multiple Gmail filters at once. Useful for setting up an entire filtering system in one call.

Args:
  - filters (array): Array of filter objects, each with:
    - name (string): Human-readable name for this filter (for your reference, not stored in Gmail)
    - criteria: { from?, to?, subject?, query?, hasAttachment?, excludeChats? }
    - action: { addLabelIds?, removeLabelIds? }

Returns:
  Summary of created filters with success/failure for each.`,
      inputSchema: z.object({
        filters: z.array(
          z.object({
            name: z.string().describe("Human-readable name for reference"),
            criteria: z.object({
              from: z.string().optional(),
              to: z.string().optional(),
              subject: z.string().optional(),
              query: z.string().optional(),
              hasAttachment: z.boolean().optional(),
              excludeChats: z.boolean().optional(),
            }),
            action: z.object({
              addLabelIds: z.array(z.string()).optional(),
              removeLabelIds: z.array(z.string()).optional(),
            }),
          })
        ).min(1).max(50).describe("Array of filters to create"),
      }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    async ({ filters }) => {
      const gmail = getGmailClient();
      const results: Array<{ name: string; success: boolean; id?: string; error?: string }> = [];

      for (const filter of filters) {
        try {
          const res = await gmail.users.settings.filters.create({
            userId: "me",
            requestBody: {
              criteria: filter.criteria,
              action: filter.action,
            },
          });
          results.push({ name: filter.name, success: true, id: res.data.id ?? undefined });
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          results.push({ name: filter.name, success: false, error: message });
        }
      }

      const succeeded = results.filter((r) => r.success);
      const failed = results.filter((r) => !r.success);

      const lines = [
        `## Bulk Filter Creation Results`,
        `✅ ${succeeded.length} created, ❌ ${failed.length} failed\n`,
        ...results.map((r) =>
          r.success
            ? `✅ **${r.name}** — id: \`${r.id}\``
            : `❌ **${r.name}** — ${r.error}`
        ),
      ];

      return {
        content: [{ type: "text", text: lines.join("\n") }],
        structuredContent: { results, succeeded: succeeded.length, failed: failed.length },
      };
    }
  );
}
