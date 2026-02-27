# Gmail Filters MCP Server

A custom MCP server that gives Claude the ability to create, list, and delete Gmail filters and labels — the things the built-in Gmail MCP connector can't do.

## Tools Available

| Tool | Description |
|------|-------------|
| `gmail_list_labels` | List all labels in your Gmail |
| `gmail_create_label` | Create a new label/category |
| `gmail_delete_label` | Delete a label |
| `gmail_list_filters` | List all existing filters |
| `gmail_create_filter` | Create a single filter rule |
| `gmail_delete_filter` | Delete a filter |
| `gmail_bulk_create_filters` | Create many filters at once |

---

## Setup

### Prerequisites
- Node.js 18+
- A Google Cloud project with Gmail API enabled
- OAuth2 credentials downloaded as `credentials.json`

### Step 1 — Install dependencies

```bash
npm install
```

### Step 2 — Add your credentials

Place the `credentials.json` file you downloaded from Google Cloud Console into the **root of this folder** (next to `package.json`).

### Step 3 — Run the one-time auth flow

```bash
npm run build
node dist/auth.js
```

This will:
1. Print a Google OAuth URL
2. Ask you to open it, sign in, and paste back the code
3. Save a `token.json` file locally

You only need to do this once. The token auto-refreshes after that.

### Step 4 — Build and test

```bash
npm run build
```

### Step 5 — Connect to Claude Desktop

Add this to your Claude Desktop config file:

**Mac:** `~/Library/Application Support/Claude/claude_desktop_config.json`  
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "gmail-filters": {
      "command": "node",
      "args": ["/FULL/PATH/TO/gmail-filters-mcp-server/dist/index.js"]
    }
  }
}
```

Replace `/FULL/PATH/TO/` with the actual path to where you saved this folder.

Restart Claude Desktop and you'll see the new tools available.

---

## Example Usage

Once connected, you can say things like:

- *"List all my Gmail labels"*
- *"Create a label called 'Newsletters'"*
- *"Create a filter that archives all emails from @marketing.com and applies the Newsletters label"*
- *"Set up filters for all our categories"*

---

## Filter Patterns

| Goal | addLabelIds | removeLabelIds |
|------|-------------|----------------|
| Archive + label | `["your-label-id"]` | `["INBOX"]` |
| Mark as read | — | `["UNREAD"]` |
| Star it | `["STARRED"]` | — |
| Move to spam | `["SPAM"]` | — |
| Archive only | — | `["INBOX"]` |
