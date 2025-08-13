# Simple Task MCP Project Overview

## Purpose
This is a Model Context Protocol (MCP) server that provides comprehensive access to Simple Task project management capabilities. The server integrates with the aitistra.com service to manage tasks, projects, and team collaboration.

## Key Features
- Task management (CRUD operations)
- Project organization and multi-project support
- Priority and status management (low/medium/high priorities, todo/in_progress/review/completed/blocked statuses)
- Task dependencies and relationships
- Comment system with threading
- AI-powered task generation
- Pagination and performance optimization

## Architecture
- **Main Server**: `src/index.ts` - MCP server implementation with tool handlers
- **Service Layer**: `src/services/simpletask.ts` - Simple Task API client
- **Configuration**: JSON-based project configuration in `projects.json`
- **Build System**: TypeScript compilation to `build/` directory

## Integration Points
- Simple Task API at `https://api.simpletask.app/api/v1`
- Authentication via Bearer tokens using project API keys
- Multi-project support with project-specific credentials