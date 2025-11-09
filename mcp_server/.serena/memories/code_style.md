# Code Style & Conventions

- Strict TypeScript config (`strict`, `esModuleInterop`, `forceConsistentCasingInFileNames`).
- Uses ES2022 targets, ESNext modules.
- Functions are typed; service methods return typed interfaces (e.g., `Task`, `PaginatedResponse`).
- Implements pagination helpers and summary transformation functions.
- Logging via `console.log`/`console.warn` for diagnostic info.
