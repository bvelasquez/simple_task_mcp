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
- `simpletask_get_tasks` - List tasks with optional filtering
- `simpletask_get_task` - Get a specific task by ID
- `simpletask_update_task` - Update task properties
- `simpletask_delete_task` - Delete a task
- `simpletask_search_tasks` - Search tasks by criteria
- `simpletask_get_tasks_by_status` - Filter tasks by status
- `simpletask_get_tasks_by_priority` - Filter tasks by priority
- `simpletask_get_tasks_by_order_key` - Get tasks by order
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
  user_id: "user-123",
  project_name: "simple_task",
});
```

### Searching Tasks

```javascript
await callTool("simpletask_search_tasks", {
  query: "authentication",
  status: "in_progress",
  priority: "high",
  limit: 10,
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

```javascript
await callTool("simpletask_generate_tasks", {
  prompt: "Create tasks for building a React dashboard with user management",
  user_id: "user-123",
  project_name: "simple_task"
});
## Development

### Project Structure

```

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
```

### Adding New Features

1. **Add new methods to `SimpleTaskService`** in `src/services/simpletask.ts`
2. **Register new tools** in the `ListToolsRequestSchema` handler in `src/index.ts`
3. **Add tool handlers** in the `CallToolRequestSchema` switch statement
4. **Update this README** with documentation for new tools

### API Integration

The server integrates with Simple Task's REST API:

- **Base URL**: `https://api.simpletask.app/api/v1` (configurable)
- **Authentication**: Bearer token using project API keys
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
});

// Run a query
await callTool("supabase_query", {
query: "SELECT \* FROM users WHERE email = $1",
params: ["user@example.com"],
});

// Run a migration
await callTool("supabase_run_migration", {
migration_sql: "ALTER TABLE users ADD COLUMN last_login TIMESTAMP;",
description: "Add last_login column to users table",
});

````

#### Stripe Operations

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
│       ├── supabase.ts       # Database operations
│       ├── stripe.ts         # Payment operations
│       └── sendgrid.ts       # Email operations
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

1. **Database Connection Issues**

   - Verify `SUPABASE_DB_URL` is correct
   - Check network connectivity
   - Ensure SSL settings are correct

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
