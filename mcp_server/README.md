# Simple Task MCP Server

A Model Context Protocol (MCP) server that provides comprehensive access to Simple Task project management capabilities. This server enables ## Example Usage

### Project Management

```javascript
// List all available projects
await callTool("simpletask_list_projects", {});

// Find projects by keyword
await callTool("simpletask_find_project", {
  query: "development",
});

// Get detailed information about a specific project
await callTool("simpletask_get_project_details", {
  project_name: "simple_task",
});
```

### Creating a Task

````javascript
await callTool("simpletask_create_task", {
  title: "Implement user authentication",
  description: "Add JWT-based authentication system",
  status: "todo",
  priority: "high",
  user_id: "user-123",
  project_name: "simple_task"
});
```gration with Simple Task's API for task management, project organization, and team collaboration.

## Features

### Task Management

- **Create Tasks**: Create new tasks with full metadata support
- **Task Retrieval**: Get individual tasks or search across projects
- **Task Updates**: Modify task properties, status, and assignments
- **Task Deletion**: Remove tasks with proper cleanup
- **Status Management**: Update task statuses and track progress
- **Priority Management**: Set and modify task priorities
- **Dependencies**: Manage task relationships and dependencies

### Project Operations

- **Project Information**: Retrieve project details and metadata
- **Multi-Project Support**: Work with multiple projects simultaneously
- **Project-Specific Queries**: Filter operations by project

### Comment System

- **Task Comments**: Add, update, and retrieve task comments
- **Comment Threads**: Manage nested comment conversations
- **Reply System**: Reply to existing comments
- **Project Comments**: View all comments across a project

### Advanced Features

- **Task Generation**: AI-powered task creation from descriptions
- **Search Capabilities**: Advanced task search with filters
- **Bulk Operations**: Efficient handling of multiple tasks
- **Order Management**: Custom task ordering and organization

## Installation

1. **Clone and install dependencies:**

```bash
cd mcp_server
npm install
````

2. **Build the server:**

```bash
npm run build
```

## Configuration

This MCP server uses a JSON-based configuration system. All project settings are managed through a `projects.json` file - no environment variables are required.

### Project Configuration

Create a `projects.json` file in the root directory with your Simple Task project configurations:

```json
[
  {
    "name": "Simple Task",
    "projectName": "simple_task",
    "apiKey": "st_proj_your_api_key_here",
    "projectId": "your-project-id-here",
    "description": "Main Simple Task project"
  },
  {
    "name": "Development Project",
    "projectName": "dev_project",
    "apiKey": "st_proj_dev_api_key_here",
    "projectId": "dev-project-id-here",
    "description": "Development and testing project"
  }
]
```

### Setup Steps

1. **Copy the example configuration:**

```bash
cp projects.example.json projects.json
```

2. **Update with your credentials:**

   - Replace `apiKey` with your Simple Task API key
   - Replace `projectId` with your Simple Task project ID
   - Customize project names and descriptions as needed

3. **Secure your configuration:**
   - The `projects.json` file is automatically ignored by git
   - Keep your API keys secure and never commit them

## Usage

### Running the Server

**Development mode:**

```bash
npm run dev
```

**Production mode:**

```bash
npm run build
npm start
```

### MCP Client Configuration

Add to your MCP client configuration (e.g., Claude Desktop):

```json
{
  "mcpServers": {
    "simple-task": {
      "command": "node",
      "args": ["/path/to/simple_task_mcp/mcp_server/build/index.js"]
    }
  }
}
```

## Available Tools

### Project Management

- `simpletask_list_projects` - List all available projects with details
- `simpletask_find_project` - Find projects by name or description
- `simpletask_get_project_details` - Get detailed information about a specific project
- `simpletask_get_project_info` - Get project information

### Task Operations

- `simpletask_create_task` - Create a new task
- `simpletask_get_tasks` - **[ENHANCED]** List tasks with pagination and summary support
- `simpletask_get_tasks_summary` - **[NEW]** Get lightweight task summaries to reduce token usage
- `simpletask_get_task` - Get a specific task by ID (always returns full data)
- `simpletask_update_task` - Update task properties
- `simpletask_delete_task` - Delete a task
- `simpletask_search_tasks` - **[ENHANCED]** Search tasks with pagination and summary support
- `simpletask_get_tasks_by_status` - **[ENHANCED]** Filter tasks by status with pagination
- `simpletask_get_tasks_by_priority` - **[ENHANCED]** Filter tasks by priority with pagination
- `simpletask_get_tasks_by_order_key` - **[ENHANCED]** Get tasks by order with pagination
- `simpletask_update_task_status` - Update task status
- `simpletask_generate_tasks` - AI-powered task generation

### Dependency Management

- `simpletask_get_task_dependents` - Get tasks that depend on a task
- `simpletask_get_task_dependencies` - Get tasks that a task depends on

### Comment Operations

- `simpletask_create_comment` - Add a comment to a task
- `simpletask_get_task_comments` - Get all comments for a task
- `simpletask_update_comment` - Update an existing comment
- `simpletask_delete_comment` - Delete a comment
- `simpletask_get_comment` - Get a specific comment
- `simpletask_reply_to_comment` - Reply to an existing comment
- `simpletask_get_comment_thread` - Get a complete comment thread
- `simpletask_get_project_comments` - Get all comments in a project

## Example Usage

### Creating a Task

```javascript
await callTool("simpletask_create_task", {
  title: "Implement user authentication",
  description: "Add JWT-based authentication system",
  status: "todo",
  priority: "high",
  project_name: "simple_task",
});
```

### Getting Tasks with Pagination

```javascript
// Get first 10 tasks as summaries (lightweight)
await callTool("simpletask_get_tasks", {
  limit: 10,
  offset: 0,
  include_full_data: false, // Returns summary data only
  project_name: "simple_task",
});

// Get full task data with pagination
await callTool("simpletask_get_tasks", {
  limit: 25,
  offset: 0,
  include_full_data: true, // Returns complete task data
  project_name: "simple_task",
});
```

### Using the Summary Tool

```javascript
// Get lightweight task summaries (recommended for initial queries)
await callTool("simpletask_get_tasks_summary", {
  limit: 50,
  offset: 0,
  project_name: "simple_task",
});
```

### Searching Tasks with Pagination

```javascript
await callTool("simpletask_search_tasks", {
  query: "authentication",
  limit: 10,
  offset: 0,
  include_full_data: false, // Use summary for better performance
  project_name: "simple_task",
});
```

### Filtering Tasks by Status

```javascript
await callTool("simpletask_get_tasks_by_status", {
  status: "in_progress",
  limit: 25,
  offset: 0,
  include_full_data: false,
  project_name: "simple_task",
});
```

### Adding Comments

```javascript
await callTool("simpletask_create_comment", {
  task_id: "task-456",
  content: "Started working on the login flow",
  user_id: "user-123",
});
```

### Generating Tasks with AI

````javascript
await callTool("simpletask_generate_tasks", {
  description: "Create tasks for building a React dashboard with user management",
  project_name: "simple_task"
});
## Pagination and Performance Features

### Overview

The Simple Task MCP now includes comprehensive pagination and summarization features to improve performance and reduce token usage, especially for large projects.

### Key Features

- **Automatic Limiting**: All task retrieval operations now limit results (default: 25, max: 100)
- **Summary Mode**: Lightweight task summaries include only essential fields
- **Pagination Support**: Offset-based pagination for handling large datasets
- **Token Optimization**: Summary responses reduce token usage by ~70%

### Summary vs Full Data

**Summary Fields** (include_full_data: false):
- `id`, `title`, `status`, `priority`, `created_at`, `assigned_to`

**Full Data** (include_full_data: true):
- All task fields including `description`, `depends_on`, `due_date`, `checklist`, etc.

### Pagination Parameters

All enhanced tools support these parameters:

- `limit` (number): Maximum items to return (1-100, default: 25)
- `offset` (number): Number of items to skip (default: 0)
- `include_full_data` (boolean): Return full data (true) or summary (false, default)

### Response Format

Paginated responses include metadata:

```javascript
{
  "items": [...], // Task data (summary or full)
  "total_count": 150, // Total tasks matching criteria
  "has_more": true, // Whether more results exist
  "next_offset": 25, // Offset for next page (if has_more)
  "limit": 25, // Applied limit
  "offset": 0 // Current offset
}
````

### Best Practices

1. **Use Summaries First**: Start with `simpletask_get_tasks_summary` or `include_full_data: false`
2. **Fetch Details on Demand**: Use `simpletask_get_task` for full details of specific tasks
3. **Reasonable Limits**: Use smaller limits (10-25) for initial queries
4. **Implement Pagination**: Use `has_more` and `next_offset` for pagination

## Development

### Project Structure

````

```text
mcp_server/
├── src/
│ ├── index.ts # Main MCP server
│ └── services/
│ └── simpletask.ts # Simple Task API client
├── build/ # Compiled TypeScript
├── projects.json # Project configuration (create from example)
├── projects.example.json # Example configuration
├── package.json
├── tsconfig.json
└── README.md
````

### Adding New Features

1. **Add new methods to `SimpleTaskService`** in `src/services/simpletask.ts`
2. **Register new tools** in the `ListToolsRequestSchema` handler in `src/index.ts`
3. **Add tool handlers** in the `CallToolRequestSchema` switch statement
4. **Update this README** with documentation for new tools

### API Integration

The server integrates with Simple Task's public REST API:

- **Base URL**: `https://us-central1-aitistra.cloudfunctions.net/publicApi` (configurable via projects.json)
- **Authentication**: Bearer token using project API keys (sent as `Authorization: Bearer <API_KEY>`)
- **Response Format**: JSON with consistent error handling

### Error Handling

All tools include comprehensive error handling:

- API errors are caught and formatted appropriately
- Network issues are handled gracefully
- Invalid parameters trigger clear error messages
- All responses follow MCP protocol standards

## Multi-Project Support

The server supports multiple projects simultaneously:

- **Default Project**: Uses the first project in `projects.json`
- **Project Selection**: Many tools accept a `project_name` parameter
- **Automatic Switching**: API calls use the appropriate credentials per project
- **Isolation**: Projects are completely isolated from each other

## Security

- **API Keys**: Stored locally in `projects.json` (git-ignored)
- **No Environment Variables**: All configuration is file-based
- **Secure Communication**: All API calls use HTTPS
- **Error Sanitization**: Sensitive data is not exposed in error messages

## Troubleshooting

### Common Issues

1. **"projects.json file is required"**

   - Copy `projects.example.json` to `projects.json`
   - Update with your actual API credentials

2. **"Invalid API key" errors**

   - Verify your Simple Task API key is correct
   - Ensure the API key matches the project ID

3. **"Project not found" errors**

   - Check that project names in `projects.json` match your usage
   - Verify project IDs are correct

4. **Build errors**
   - Run `npm install` to ensure dependencies are installed
   - Check TypeScript compilation with `npm run build`

### Debug Mode

Enable detailed logging:

```bash
DEBUG=* npm run dev
```

### Getting Help

- Check the Simple Task API documentation
- Verify your `projects.json` configuration
- Review error messages for specific guidance
- Ensure all required fields are provided in tool calls

## License

This project is licensed under the MIT License.

```javascript
// List customers
await callTool("stripe_list_customers", {
  limit: 10,
  email: "customer@example.com",
});

// Get subscription details
await callTool("stripe_list_subscriptions", {
  customer_id: "cus_...",
  status: "active",
});

// List webhook events
await callTool("stripe_webhook_events", {
  limit: 5,
  type: "customer.subscription.created",
});
````

#### Email Operations

```javascript
// Send test email
await callTool("sendgrid_send_test_email", {
  to: "test@example.com",
  subject: "Test Email",
  html: "<p>This is a test email</p>",
});

// Send template email
await callTool("sendgrid_send_template_email", {
  to: "student@example.com",
  templateType: "registration-confirmation",
  templateData: {
    studentFirstName: "John",
    studentLastName: "Doe",
    className: "iPhone Basics",
    classDate: "2025-06-20",
    classTime: "10:00 AM",
    classLocation: "Community Center",
    classDuration: "2 hours",
  },
});
```

## Development

### Project Structure

```text
mcp_server/
├── src/
│   ├── index.ts              # Main server entry point
│   └── services/
│       └── simpletask.ts     # Simple Task API operations
├── package.json
├── tsconfig.json
└── README.md
```

### Adding New Tools

1. Add the tool definition to the `ListToolsRequestSchema` handler in `index.ts`
2. Add the tool handler to the `CallToolRequestSchema` switch statement
3. Implement the functionality in the appropriate service class

### Database Migrations

The server includes a safe migration runner that:

- Uses database transactions
- Logs migration execution
- Provides rollback on errors

### Error Handling

All tools include comprehensive error handling and return structured responses with:

- Success/error status
- Detailed error messages
- Relevant data or context

## Security Notes

- The server uses environment variables for all sensitive configuration
- Database connections use SSL
- All operations are logged for audit purposes
- Migration operations are transactional to prevent partial failures

## Integration with EduAxios

This MCP server is designed specifically for the EduAxios project and includes:

- Knowledge of the database schema
- Stripe product/pricing structure awareness
- Email template support for common use cases
- Integration with existing scripts and utilities

## Troubleshooting

### Common Issues

1. **API Connection Issues**

   - Verify your Firebase API endpoint is accessible
   - Check network connectivity
   - Ensure API keys are correct

2. **Stripe API Issues**

   - Verify `STRIPE_SECRET_KEY` is valid
   - Check API version compatibility
   - Review rate limiting

3. **SendGrid Issues**
   - Verify `SENDGRID_API_KEY` is valid
   - Ensure sender email is verified
   - Check domain authentication

### Debugging

Enable debug mode:

```bash
DEBUG=* npm run dev
```

Check logs for detailed error information and API responses.
