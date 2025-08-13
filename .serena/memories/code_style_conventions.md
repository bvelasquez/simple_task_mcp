# Code Style and Conventions

## TypeScript Configuration
- Target: ES2022
- Module: ESNext with Node resolution
- Strict type checking enabled
- Source maps and declarations generated

## Code Structure
- **Functional Programming**: Use async/await for asynchronous operations
- **Interface-Driven**: Strong typing with TypeScript interfaces
- **Service Pattern**: Business logic in service classes
- **Error Handling**: Comprehensive error handling with structured responses

## Naming Conventions
- **Files**: kebab-case for files (`simpletask.ts`)
- **Classes**: PascalCase (`SimpleTaskService`)
- **Functions**: camelCase (`handleSimpleTaskCreateTask`)
- **Interfaces**: PascalCase (`ProjectConfig`, `Task`)
- **Constants**: SCREAMING_SNAKE_CASE or camelCase depending on scope

## Tool Naming Pattern
- MCP tools follow pattern: `simpletask_action_target`
- Examples: `simpletask_create_task`, `simpletask_get_tasks_by_status`

## API Integration Patterns
- Use fetch with proper error handling
- Bearer token authentication
- JSON request/response format
- Pagination support with offset/limit