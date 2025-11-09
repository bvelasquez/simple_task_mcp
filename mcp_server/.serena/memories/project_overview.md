# Simple Task MCP Server Overview

- **Purpose**: MCP server that exposes Simple Task project/task/comment features as Model Context Protocol tools.
- **Primary entrypoint**: `src/index.ts` implements the MCP server using `@modelcontextprotocol/sdk`.
- **SimpleTaskService**: `src/services/simpletask.ts` handles REST calls to Simple Task API (project/task CRUD, search, comments, AI, checklist).
- **Configuration**: `projects.json` lists project definitions with name, projectName, API key, projectId (copied from `projects.example.json`).
- **Access**: Communicates with Simple Task API at `https://apiv1-5kr4fylsmq-uc.a.run.app/api-v1`, using project API keys for auth.
- **Build output**: TypeScript compiled into `build/` directory.
- **Docs/examples**: README describes tools, sample usage, pagination, email/Stripe sections (legacy copy).
