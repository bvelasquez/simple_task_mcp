# Project Structure

```
mcp_server/
├── src/
│   ├── index.ts                # Main MCP server: tool registry, call handling, SimpleTaskService usage
│   └── services/
│       └── simpletask.ts       # REST client for Simple Task API (tasks/projects/comments/etc.)
├── build/                      # Compiled JS output (tsc)
├── projects.json               # User-supplied project definitions (gitignored)
├── projects.example.json       # Sample configuration
├── package.json                # Scripts, dependencies (`@modelcontextprotocol/sdk`, `node-fetch`)
├── tsconfig.json               # TypeScript compiler options
└── README.md                   # Usage guide & tool descriptions
```
