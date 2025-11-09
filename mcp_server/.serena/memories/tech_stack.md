# Tech Stack

- **Language**: TypeScript (ESNext modules, strict type checking).
- **Runtime**: Node.js 18+ (uses `node-fetch`, `dotenv`).
- **MCP SDK**: `@modelcontextprotocol/sdk` for implementing server and tools.
- **Build tooling**: `tsx` for dev/watch, `tsc` for production build.
- **Config**: JSON-based (`projects.json`), no DB directly.
- **HTTP client**: `node-fetch` for REST requests.
