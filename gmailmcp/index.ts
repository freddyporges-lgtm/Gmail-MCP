import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerLabelTools } from "./tools/labels.js";
import { registerFilterTools } from "./tools/filters.js";

const server = new McpServer({
  name: "gmail-filters-mcp-server",
  version: "1.0.0",
});

// Register all tools
registerLabelTools(server);
registerFilterTools(server);

// Run via stdio (for local MCP clients like Claude Desktop)
async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Gmail Filters MCP Server running via stdio");
}

main().catch((error: unknown) => {
  console.error("Server error:", error);
  process.exit(1);
});
