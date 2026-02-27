"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// index.ts
var import_mcp = require("@modelcontextprotocol/sdk/server/mcp.js");
var import_stdio = require("@modelcontextprotocol/sdk/server/stdio.js");

// tools/labels.ts
var import_zod = require("zod");

// services/gmail.ts
var import_googleapis = require("googleapis");
var fs = __toESM(require("fs"));
var path = __toESM(require("path"));
var CREDENTIALS_PATH = path.join(__dirname, "..", "credentials.json");
var TOKEN_PATH = path.join(__dirname, "..", "token.json");
var _gmailClient = null;
function getOAuthClient() {
  if (!fs.existsSync(CREDENTIALS_PATH)) {
    throw new Error(
      `credentials.json not found. Please download it from Google Cloud Console and place it at: ${CREDENTIALS_PATH}`
    );
  }
  const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, "utf8"));
  const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;
  const oAuth2Client = new import_googleapis.google.auth.OAuth2(
    client_id,
    client_secret,
    redirect_uris[0]
  );
  if (!fs.existsSync(TOKEN_PATH)) {
    throw new Error(
      `token.json not found. Please run the auth script first:
  npm run auth
  node dist/auth.js`
    );
  }
  const token = JSON.parse(fs.readFileSync(TOKEN_PATH, "utf8"));
  oAuth2Client.setCredentials(token);
  oAuth2Client.on("tokens", (tokens) => {
    const current = JSON.parse(fs.readFileSync(TOKEN_PATH, "utf8"));
    const updated = { ...current, ...tokens };
    fs.writeFileSync(TOKEN_PATH, JSON.stringify(updated, null, 2));
  });
  return oAuth2Client;
}
function getGmailClient() {
  if (!_gmailClient) {
    const auth = getOAuthClient();
    _gmailClient = import_googleapis.google.gmail({ version: "v1", auth });
  }
  return _gmailClient;
}

// tools/labels.ts
function registerLabelTools(server2) {
  server2.registerTool(
    "gmail_list_labels",
    {
      title: "List Gmail Labels",
      description: `List all labels in the Gmail account, including system labels (INBOX, SPAM, etc.) and user-created labels.

Returns:
  Array of labels with id, name, type (system/user), and visibility settings.

Use this to find existing label IDs before creating filters.`,
      inputSchema: import_zod.z.object({}),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false
      }
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
        labelListVisibility: l.labelListVisibility
      }));
      const userLabels = formatted.filter((l) => l.type === "user");
      const systemLabels = formatted.filter((l) => l.type === "system");
      const text = [
        `## User Labels (${userLabels.length})`,
        ...userLabels.map((l) => `- **${l.name}** (id: \`${l.id}\`)`),
        `
## System Labels (${systemLabels.length})`,
        ...systemLabels.map((l) => `- ${l.name} (id: \`${l.id}\`)`)
      ].join("\n");
      return {
        content: [{ type: "text", text }],
        structuredContent: { labels: formatted }
      };
    }
  );
  server2.registerTool(
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
      inputSchema: import_zod.z.object({
        name: import_zod.z.string().min(1).max(225).describe('Label name, e.g. "Work", "newsletters", or "Work/Invoices" for nested'),
        messageListVisibility: import_zod.z.enum(["show", "hide"]).default("show").describe("Whether messages with this label appear in message list"),
        labelListVisibility: import_zod.z.enum(["labelShow", "labelShowIfUnread", "labelHide"]).default("labelShow").describe("Whether label appears in the label list sidebar")
      }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false
      }
    },
    async ({ name, messageListVisibility, labelListVisibility }) => {
      const gmail = getGmailClient();
      const res = await gmail.users.labels.create({
        userId: "me",
        requestBody: {
          name,
          messageListVisibility,
          labelListVisibility
        }
      });
      const label = res.data;
      const text = `\u2705 Label created successfully!
- Name: **${label.name}**
- ID: \`${label.id}\`

Use this ID when creating filters.`;
      return {
        content: [{ type: "text", text }],
        structuredContent: { id: label.id, name: label.name }
      };
    }
  );
  server2.registerTool(
    "gmail_delete_label",
    {
      title: "Delete Gmail Label",
      description: `Delete a user-created Gmail label. System labels cannot be deleted.

Args:
  - labelId (string): The label ID to delete (get from gmail_list_labels)

Warning: This permanently deletes the label. Messages keep their content but lose this label.`,
      inputSchema: import_zod.z.object({
        labelId: import_zod.z.string().min(1).describe("Label ID to delete (from gmail_list_labels)")
      }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: false
      }
    },
    async ({ labelId }) => {
      const gmail = getGmailClient();
      await gmail.users.labels.delete({ userId: "me", id: labelId });
      return {
        content: [{ type: "text", text: `\u2705 Label \`${labelId}\` deleted successfully.` }],
        structuredContent: { deleted: true, labelId }
      };
    }
  );
}

// tools/filters.ts
var import_zod2 = require("zod");
function registerFilterTools(server2) {
  server2.registerTool(
    "gmail_list_filters",
    {
      title: "List Gmail Filters",
      description: `List all existing Gmail filters/rules.

Returns:
  Array of filters with their criteria (from, to, subject, query, etc.) and actions (apply label, skip inbox, mark read, etc.).

Use this to see what filters already exist before creating new ones.`,
      inputSchema: import_zod2.z.object({}),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false
      }
    },
    async () => {
      const gmail = getGmailClient();
      const res = await gmail.users.settings.filters.list({ userId: "me" });
      const filters = res.data.filter || [];
      if (filters.length === 0) {
        return {
          content: [{ type: "text", text: "No filters found in this Gmail account." }],
          structuredContent: { filters: [] }
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
          criteria.excludeChats && `exclude chats`
        ].filter(Boolean).join(", ");
        const actionStr = [
          ...(action.addLabelIds || []).map((id) => `add label: ${id}`),
          ...(action.removeLabelIds || []).map((id) => `remove label: ${id}`)
        ].join(", ");
        return `**Filter ${i + 1}** (id: \`${f.id}\`)
  Criteria: ${criteriaStr || "none"}
  Actions: ${actionStr || "none"}`;
      });
      return {
        content: [{ type: "text", text: `## Gmail Filters (${filters.length})

` + lines.join("\n\n") }],
        structuredContent: { filters }
      };
    }
  );
  server2.registerTool(
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
      inputSchema: import_zod2.z.object({
        from: import_zod2.z.string().optional().describe('Filter emails from this sender, e.g. "boss@company.com" or "@newsletters.com"'),
        to: import_zod2.z.string().optional().describe("Filter emails sent to this address"),
        subject: import_zod2.z.string().optional().describe("Filter emails with this text in subject"),
        query: import_zod2.z.string().optional().describe('Gmail search query, e.g. "newsletter OR unsubscribe"'),
        hasAttachment: import_zod2.z.boolean().optional().describe("Filter emails with attachments"),
        excludeChats: import_zod2.z.boolean().optional().describe("Exclude Google Chat messages"),
        addLabelIds: import_zod2.z.array(import_zod2.z.string()).optional().describe('Label IDs to add, e.g. ["INBOX", "Label_123"] or custom label IDs'),
        removeLabelIds: import_zod2.z.array(import_zod2.z.string()).optional().describe('Label IDs to remove, e.g. ["INBOX"] to archive, ["UNREAD"] to mark as read')
      }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false
      }
    },
    async ({ from, to, subject, query, hasAttachment, excludeChats, addLabelIds, removeLabelIds }) => {
      if (!from && !to && !subject && !query && hasAttachment === void 0 && excludeChats === void 0) {
        throw new Error("At least one filter criteria is required (from, to, subject, query, hasAttachment, or excludeChats).");
      }
      if ((!addLabelIds || addLabelIds.length === 0) && (!removeLabelIds || removeLabelIds.length === 0)) {
        throw new Error("At least one action is required (addLabelIds or removeLabelIds).");
      }
      const gmail = getGmailClient();
      const criteria = {};
      if (from) criteria.from = from;
      if (to) criteria.to = to;
      if (subject) criteria.subject = subject;
      if (query) criteria.query = query;
      if (hasAttachment !== void 0) criteria.hasAttachment = hasAttachment;
      if (excludeChats !== void 0) criteria.excludeChats = excludeChats;
      const action = {};
      if (addLabelIds && addLabelIds.length > 0) action.addLabelIds = addLabelIds;
      if (removeLabelIds && removeLabelIds.length > 0) action.removeLabelIds = removeLabelIds;
      const res = await gmail.users.settings.filters.create({
        userId: "me",
        requestBody: { criteria, action }
      });
      const filter = res.data;
      const criteriaDesc = Object.entries(criteria).map(([k, v]) => `${k}: ${v}`).join(", ");
      const actionDesc = [
        ...(addLabelIds || []).map((id) => `add label "${id}"`),
        ...(removeLabelIds || []).map((id) => `remove label "${id}"`)
      ].join(", ");
      const text = `\u2705 Filter created successfully!
- ID: \`${filter.id}\`
- Criteria: ${criteriaDesc}
- Actions: ${actionDesc}`;
      return {
        content: [{ type: "text", text }],
        structuredContent: { id: filter.id, criteria, action }
      };
    }
  );
  server2.registerTool(
    "gmail_delete_filter",
    {
      title: "Delete Gmail Filter",
      description: `Delete an existing Gmail filter rule.

Args:
  - filterId (string): The filter ID to delete (get from gmail_list_filters)

Warning: This permanently deletes the filter. Existing emails are not affected, only future emails.`,
      inputSchema: import_zod2.z.object({
        filterId: import_zod2.z.string().min(1).describe("Filter ID to delete (from gmail_list_filters)")
      }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: false
      }
    },
    async ({ filterId }) => {
      const gmail = getGmailClient();
      await gmail.users.settings.filters.delete({ userId: "me", id: filterId });
      return {
        content: [{ type: "text", text: `\u2705 Filter \`${filterId}\` deleted successfully.` }],
        structuredContent: { deleted: true, filterId }
      };
    }
  );
  server2.registerTool(
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
      inputSchema: import_zod2.z.object({
        filters: import_zod2.z.array(
          import_zod2.z.object({
            name: import_zod2.z.string().describe("Human-readable name for reference"),
            criteria: import_zod2.z.object({
              from: import_zod2.z.string().optional(),
              to: import_zod2.z.string().optional(),
              subject: import_zod2.z.string().optional(),
              query: import_zod2.z.string().optional(),
              hasAttachment: import_zod2.z.boolean().optional(),
              excludeChats: import_zod2.z.boolean().optional()
            }),
            action: import_zod2.z.object({
              addLabelIds: import_zod2.z.array(import_zod2.z.string()).optional(),
              removeLabelIds: import_zod2.z.array(import_zod2.z.string()).optional()
            })
          })
        ).min(1).max(50).describe("Array of filters to create")
      }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false
      }
    },
    async ({ filters }) => {
      const gmail = getGmailClient();
      const results = [];
      for (const filter of filters) {
        try {
          const res = await gmail.users.settings.filters.create({
            userId: "me",
            requestBody: {
              criteria: filter.criteria,
              action: filter.action
            }
          });
          results.push({ name: filter.name, success: true, id: res.data.id ?? void 0 });
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          results.push({ name: filter.name, success: false, error: message });
        }
      }
      const succeeded = results.filter((r) => r.success);
      const failed = results.filter((r) => !r.success);
      const lines = [
        `## Bulk Filter Creation Results`,
        `\u2705 ${succeeded.length} created, \u274C ${failed.length} failed
`,
        ...results.map(
          (r) => r.success ? `\u2705 **${r.name}** \u2014 id: \`${r.id}\`` : `\u274C **${r.name}** \u2014 ${r.error}`
        )
      ];
      return {
        content: [{ type: "text", text: lines.join("\n") }],
        structuredContent: { results, succeeded: succeeded.length, failed: failed.length }
      };
    }
  );
}

// index.ts
var server = new import_mcp.McpServer({
  name: "gmail-filters-mcp-server",
  version: "1.0.0"
});
registerLabelTools(server);
registerFilterTools(server);
async function main() {
  const transport = new import_stdio.StdioServerTransport();
  await server.connect(transport);
  console.error("Gmail Filters MCP Server running via stdio");
}
main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
