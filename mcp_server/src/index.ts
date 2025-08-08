#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import path from "path";
import { fileURLToPath } from "url";
import { SimpleTaskService } from "./services/simpletask.js";

// Setup paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log("🚀 Simple Task MCP Server starting");

// Initialize Simple Task service with JSON configuration only
const simpleTaskService = SimpleTaskService.fromProjectsJson(
  path.join(__dirname, "..", "projects.json"),
);

// Session context for project management
interface SessionContext {
  currentProject?: string;
  detectedFromWorkspace?: boolean;
  lastWorkspaceDetection?: number;
}

const sessionContext: SessionContext = {};

// Helper function to detect project from workspace
async function detectProjectFromWorkspace(): Promise<string | null> {
  try {
    // Cache workspace detection for 5 minutes
    const now = Date.now();
    if (
      sessionContext.lastWorkspaceDetection &&
      now - sessionContext.lastWorkspaceDetection < 5 * 60 * 1000 &&
      sessionContext.currentProject
    ) {
      return sessionContext.currentProject;
    }

    // Try to find project.json in common locations
    const fs = await import("fs");
    const possiblePaths = [
      "./project.json",
      "../project.json",
      "../../project.json",
      process.cwd() + "/project.json",
    ];

    for (const projectPath of possiblePaths) {
      try {
        if (fs.existsSync(projectPath)) {
          const projectData = JSON.parse(fs.readFileSync(projectPath, "utf8"));
          if (projectData.name) {
            // Try to match the project name to available Simple Task projects
            const matchedProject = findProjectByName(projectData.name);
            if (matchedProject) {
              sessionContext.currentProject = matchedProject.projectName;
              sessionContext.detectedFromWorkspace = true;
              sessionContext.lastWorkspaceDetection = now;
              console.log(
                `🔍 Auto-detected project: ${matchedProject.name} (${matchedProject.projectName})`,
              );
              return matchedProject.projectName;
            }
          }
        }
      } catch (error) {
        // Ignore errors for individual files
      }
    }
  } catch (error) {
    // Ignore workspace detection errors
  }

  return null;
}

// Helper function to find project by name (fuzzy matching)
function findProjectByName(name: string): any | null {
  const projects = simpleTaskService.getAllProjects();
  const lowerName = name.toLowerCase();

  // Exact match first
  for (const project of projects) {
    if (
      project.name.toLowerCase() === lowerName ||
      project.projectName.toLowerCase() === lowerName
    ) {
      return project;
    }
  }

  // Partial match
  for (const project of projects) {
    if (
      project.name.toLowerCase().includes(lowerName) ||
      project.projectName.toLowerCase().includes(lowerName) ||
      lowerName.includes(project.name.toLowerCase()) ||
      lowerName.includes(project.projectName.toLowerCase())
    ) {
      return project;
    }
  }

  return null;
}

// Helper function to resolve project for operations
async function resolveProjectContext(
  explicitProjectName?: string,
): Promise<string | null> {
  // 1. Use explicit project name if provided
  if (explicitProjectName) {
    return explicitProjectName;
  }

  // 2. Use session context if available
  if (sessionContext.currentProject) {
    return sessionContext.currentProject;
  }

  // 3. Try to auto-detect from workspace
  const detected = await detectProjectFromWorkspace();
  if (detected) {
    return detected;
  }

  // 4. Check if we have multiple projects and no clear choice
  const projects = simpleTaskService.getAllProjects();
  if (projects.length > 1) {
    // Multiple projects but no clear choice - return null to trigger project selection prompt
    return null;
  }

  // 5. Fall back to default project (single project case)
  const defaultProject = projects[0];
  if (defaultProject) {
    console.log(
      `📌 Using default project: ${defaultProject.name} (${defaultProject.projectName})`,
    );
    return defaultProject.projectName;
  }

  return null;
}

// Helper function to generate project resolution error response
function generateProjectResolutionError() {
  const projects = simpleTaskService.getAllProjects();
  if (projects.length > 1) {
    const projectList = projects
      .map((p, idx) => `${idx + 1}. ${p.name} (${p.projectName})`)
      .join("\n");
    return {
      content: [
        {
          type: "text",
          text: `❌ Multiple projects available but no project selected. Please use 'simpletask_switch_project' to select one:\n\n${projectList}\n\nOr specify the 'project_name' parameter directly.`,
        },
      ],
      isError: true,
    };
  } else {
    return {
      content: [
        {
          type: "text",
          text: "❌ No project specified and unable to determine current project. Use `simpletask_switch_project` to select a project or specify `project_name` parameter.",
        },
      ],
      isError: true,
    };
  }
}

// Helper function to handle project switching
function switchToProject(projectIdentifier: string): {
  success: boolean;
  message: string;
  project?: any;
} {
  const project = findProjectByName(projectIdentifier);
  if (project) {
    sessionContext.currentProject = project.projectName;
    sessionContext.detectedFromWorkspace = false;
    console.log(
      `🔄 Switched to project: ${project.name} (${project.projectName})`,
    );
    return {
      success: true,
      message: `Switched to project: ${project.name} (${project.projectName})`,
      project: project,
    };
  } else {
    return {
      success: false,
      message: `Project '${projectIdentifier}' not found. Available projects: ${simpleTaskService
        .getAllProjects()
        .map((p) => p.name)
        .join(", ")}`,
    };
  }
}

// Log project information for context
const allProjects = simpleTaskService.getAllProjects();
console.log(`📋 Loaded ${allProjects.length} project(s):`);
allProjects.forEach((project, index) => {
  const isDefault = index === 0;
  console.log(
    `   ${index + 1}. ${project.name} (${project.projectName})${
      isDefault ? " [DEFAULT]" : ""
    }`,
  );
});
console.log("");

// Initialize workspace detection
detectProjectFromWorkspace().then((detected) => {
  if (detected) {
    console.log(`🎯 Using auto-detected project: ${detected}`);
  } else {
    console.log(`📌 Using default project: ${allProjects[0]?.name || "none"}`);
  }
});

const server = new Server(
  {
    name: "simple-task-mcp-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
      elicitation: {},
    },
  },
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    ai_instructions: [
      "Always validate inputSchema before executing any tool.",
      "Limit any AI-generated lists (e.g., tasks or subtasks) to 10 items max.",
      "Check task comments and description for context before implementing features or changes.",
      "If a task seems too complex, suggest breaking it down into smaller check lists items.",
      "Check the description field of tasks for additional context or requirements.",
      "Check comments on the task for additional context or requirements.",
      "Leave comments on tasks to clarify intent or ask for more details.",
      "Reply to comments with relevant information or updates if there is a question comment.",
      "Change status of tasks to 'in_progress' when starting work, and 'completed' when done.",
    ],
    tools: [
      // Simple Task Management Tools
      {
        name: "simpletask_list_projects",
        description: "List all available Simple Task projects with details",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "simpletask_switch_project",
        description:
          "Switch to a different project for subsequent operations. This sets the session context so future task operations will default to this project.",
        inputSchema: {
          type: "object",
          properties: {
            project_identifier: {
              type: "string",
              description:
                "Project name or identifier to switch to (can be partial match)",
            },
          },
          required: ["project_identifier"],
        },
      },
      {
        name: "simpletask_get_current_project",
        description: "Get the currently active project in the session context",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "simpletask_find_project",
        description: "Find projects by name or description",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description:
                "Search term to find projects by name or description",
            },
          },
          required: ["query"],
        },
      },
      {
        name: "simpletask_get_project_details",
        description: "Get detailed information about a specific project",
        inputSchema: {
          type: "object",
          properties: {
            project_name: {
              type: "string",
              description: "The project name to get details for",
            },
          },
          required: ["project_name"],
        },
      },
      {
        name: "simpletask_create_task",
        description: "Create a new task in the Simple Task project",
        ai_instructions: [
          "When generating dependent tasks or sub-tasks, do not create more than 5 at once.",
          "Prefer grouping related implementation details under a single parent task using `depends_on`.",
          "If more than 5 dependent tasks are needed, suggest a new task group or project segment instead.",
          "Use concise, actionable titles for dependent tasks like 'Set up DB schema' or 'Integrate frontend'.",
          "ALWAYS check available projects first using simpletask_list_projects if unsure which project to use.",
          "If project_name is not specified, the task will be created in the default project.",
          "Choose the most appropriate project based on the task context and available projects.",
        ],
        tags: ["task_creation", "ai-assisted", "safe"],
        meta: {
          constraint_notes: "Max 5 dependents allowed. AI must obey.",
        },
        inputSchema: {
          type: "object",
          properties: {
            title: {
              type: "string",
              description: "Task title",
            },
            description: {
              type: "string",
              description: "Task description",
            },
            project_name: {
              type: "string",
              description:
                "Project name to create task in (optional, uses default project if not specified). Use simpletask_list_projects to see available projects.",
            },
            priority: {
              type: "string",
              enum: ["low", "medium", "high"],
              description: "Task priority",
              default: "medium",
            },
            status: {
              type: "string",
              enum: ["todo", "in_progress", "review", "completed", "blocked"],
              description: "Task status",
              default: "todo",
            },
            depends_on: {
              type: "array",
              items: { type: "string" },
              description: "Array of task IDs this task depends on",
            },
            due_date: {
              type: "string",
              description: "Due date in ISO format (optional)",
            },
            assigned_to: {
              type: "string",
              description: "User ID of assignee (optional)",
            },
          },
          required: ["title", "description"],
        },
      },
      {
        name: "simpletask_get_tasks",
        description:
          "Get tasks from the Simple Task project with pagination and summary support",
        inputSchema: {
          type: "object",
          properties: {
            project_name: {
              type: "string",
              description:
                "Project name (optional, uses default if not specified)",
            },
            limit: {
              type: "number",
              description:
                "Maximum number of tasks to return (default: 25, max: 100)",
              minimum: 1,
              maximum: 100,
              default: 25,
            },
            offset: {
              type: "number",
              description:
                "Number of tasks to skip for pagination (default: 0)",
              minimum: 0,
              default: 0,
            },
            include_full_data: {
              type: "boolean",
              description:
                "Return full task data (true) or summary data (false). Summary includes: id, title, status, priority, created_at, assigned_to (default: false)",
              default: false,
            },
          },
        },
      },
      {
        name: "simpletask_get_tasks_summary",
        description:
          "Get a lightweight summary of tasks to reduce token usage. Returns only essential fields: id, title, status, priority, created_at, assigned_to",
        inputSchema: {
          type: "object",
          properties: {
            project_name: {
              type: "string",
              description:
                "Project name (optional, uses default if not specified)",
            },
            limit: {
              type: "number",
              description:
                "Maximum number of tasks to return (default: 25, max: 100)",
              minimum: 1,
              maximum: 100,
              default: 25,
            },
            offset: {
              type: "number",
              description:
                "Number of tasks to skip for pagination (default: 0)",
              minimum: 0,
              default: 0,
            },
          },
        },
      },
      {
        name: "simpletask_get_task",
        description: "Get a specific task by ID",
        inputSchema: {
          type: "object",
          properties: {
            task_id: {
              type: "string",
              description: "ID of the task to retrieve",
            },
            project_name: {
              type: "string",
              description:
                "Project name (optional, uses default if not specified)",
            },
          },
          required: ["task_id"],
        },
      },
      {
        name: "simpletask_update_task",
        description: "Update an existing task",
        inputSchema: {
          type: "object",
          properties: {
            task_id: {
              type: "string",
              description: "ID of the task to update",
            },
            title: {
              type: "string",
              description: "New task title",
            },
            description: {
              type: "string",
              description: "New task description",
            },
            priority: {
              type: "string",
              enum: ["low", "medium", "high"],
              description: "New task priority",
            },
            status: {
              type: "string",
              enum: ["todo", "in_progress", "review", "completed", "blocked"],
              description: "New task status",
            },
            depends_on: {
              type: "array",
              items: { type: "string" },
              description: "New array of task IDs this task depends on",
            },
            due_date: {
              type: "string",
              description: "New due date in ISO format",
            },
            assigned_to: {
              type: "string",
              description: "New assignee user ID",
            },
          },
          required: ["task_id"],
        },
      },
      {
        name: "simpletask_update_task_status",
        description: "Update the status of a task",
        inputSchema: {
          type: "object",
          properties: {
            task_id: {
              type: "string",
              description: "ID of the task to update",
            },
            status: {
              type: "string",
              enum: ["todo", "in_progress", "review", "completed", "blocked"],
              description: "New task status",
            },
          },
          required: ["task_id", "status"],
        },
      },
      {
        name: "simpletask_delete_task",
        description: "Delete a task from the project",
        inputSchema: {
          type: "object",
          properties: {
            task_id: {
              type: "string",
              description: "ID of the task to delete",
            },
            project_name: {
              type: "string",
              description:
                "Project name (optional, uses default if not specified)",
            },
          },
          required: ["task_id"],
        },
      },
      {
        name: "simpletask_search_tasks",
        description:
          "Search tasks by title or description with pagination and summary support",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description:
                "Search term to look for in task titles and descriptions",
            },
            project_name: {
              type: "string",
              description:
                "Project name (optional, uses default if not specified)",
            },
            limit: {
              type: "number",
              description:
                "Maximum number of tasks to return (default: 25, max: 100)",
              minimum: 1,
              maximum: 100,
              default: 25,
            },
            offset: {
              type: "number",
              description:
                "Number of tasks to skip for pagination (default: 0)",
              minimum: 0,
              default: 0,
            },
            include_full_data: {
              type: "boolean",
              description:
                "Return full task data (true) or summary data (false). Summary includes: id, title, status, priority, created_at, assigned_to (default: false)",
              default: false,
            },
          },
          required: ["query"],
        },
      },
      {
        name: "simpletask_get_tasks_by_status",
        description:
          "Get tasks filtered by status with pagination and summary support",
        inputSchema: {
          type: "object",
          properties: {
            status: {
              type: "string",
              enum: ["todo", "in_progress", "review", "completed", "blocked"],
              description: "Status to filter by",
            },
            project_name: {
              type: "string",
              description:
                "Project name (optional, uses default if not specified)",
            },
            limit: {
              type: "number",
              description:
                "Maximum number of tasks to return (default: 25, max: 100)",
              minimum: 1,
              maximum: 100,
              default: 25,
            },
            offset: {
              type: "number",
              description:
                "Number of tasks to skip for pagination (default: 0)",
              minimum: 0,
              default: 0,
            },
            include_full_data: {
              type: "boolean",
              description:
                "Return full task data (true) or summary data (false). Summary includes: id, title, status, priority, created_at, assigned_to (default: false)",
              default: false,
            },
          },
          required: ["status"],
        },
      },
      {
        name: "simpletask_get_tasks_by_priority",
        description:
          "Get tasks filtered by priority with pagination and summary support",
        inputSchema: {
          type: "object",
          properties: {
            priority: {
              type: "string",
              enum: ["low", "medium", "high"],
              description: "Priority to filter by",
            },
            project_name: {
              type: "string",
              description:
                "Project name (optional, uses default if not specified)",
            },
            limit: {
              type: "number",
              description:
                "Maximum number of tasks to return (default: 25, max: 100)",
              minimum: 1,
              maximum: 100,
              default: 25,
            },
            offset: {
              type: "number",
              description:
                "Number of tasks to skip for pagination (default: 0)",
              minimum: 0,
              default: 0,
            },
            include_full_data: {
              type: "boolean",
              description:
                "Return full task data (true) or summary data (false). Summary includes: id, title, status, priority, created_at, assigned_to (default: false)",
              default: false,
            },
          },
          required: ["priority"],
        },
      },
      {
        name: "simpletask_get_tasks_by_order_key",
        description:
          "Get tasks filtered by order key (e.g., 'h', 'za', 'zb') with pagination and summary support",
        inputSchema: {
          type: "object",
          properties: {
            order_key: {
              type: "string",
              description: "Order key to filter by (e.g., 'h', 'za', 'zb')",
            },
            project_name: {
              type: "string",
              description:
                "Project name (optional, uses default if not specified)",
            },
            limit: {
              type: "number",
              description:
                "Maximum number of tasks to return (default: 25, max: 100)",
              minimum: 1,
              maximum: 100,
              default: 25,
            },
            offset: {
              type: "number",
              description:
                "Number of tasks to skip for pagination (default: 0)",
              minimum: 0,
              default: 0,
            },
            include_full_data: {
              type: "boolean",
              description:
                "Return full task data (true) or summary data (false). Summary includes: id, title, status, priority, created_at, assigned_to (default: false)",
              default: false,
            },
          },
          required: ["order_key"],
        },
      },
      {
        name: "simpletask_get_task_dependencies",
        description: "Get all tasks that a given task depends on",
        inputSchema: {
          type: "object",
          properties: {
            task_id: {
              type: "string",
              description: "ID of the task to get dependencies for",
            },
            project_name: {
              type: "string",
              description:
                "Project name (optional, uses default if not specified)",
            },
          },
          required: ["task_id"],
        },
      },
      {
        name: "simpletask_get_task_dependents",
        description: "Get all tasks that depend on a given task",
        inputSchema: {
          type: "object",
          properties: {
            task_id: {
              type: "string",
              description: "ID of the task to get dependents for",
            },
            project_name: {
              type: "string",
              description:
                "Project name (optional, uses default if not specified)",
            },
          },
          required: ["task_id"],
        },
      },
      {
        name: "simpletask_generate_tasks",
        description:
          "Generate structured tasks using AI based on a natural language feature description. Tasks must be concise, actionable, and limited to a maximum of 10.",
        ai_instructions: [
          "Generate no more than 10 tasks per request.",
          "Prioritize clarity and conciseness in each task title.",
          "Group related sub-tasks logically, if applicable.",
          "Avoid vague tasks like 'do the thing' or 'finalize'; be specific.",
          "Do not include implementation suggestions unless asked explicitly.",
          "If more than 10 tasks are required, suggest breaking it into multiple features.",
        ],
        inputSchema: {
          type: "object",
          properties: {
            description: {
              type: "string",
              description:
                "Natural language description of the feature or work to be done",
            },
          },
          required: ["description"],
        },
        tags: ["task_generation", "ai-assisted", "safe", "auto"],
        meta: {
          version: "1.1.0",
          author: "barry.velasquez",
          constraint_notes:
            "Max 10 tasks generated per request. AI should prioritize clarity, atomicity, and relevance.",
          prompt_behavior: "strict",
          experimental: false,
        },
      },
      {
        name: "simpletask_get_project_info",
        description: "Get information about the Simple Task project",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "simpletask_create_comment",
        description: "Create a new comment on a task",
        inputSchema: {
          type: "object",
          properties: {
            task_id: {
              type: "string",
              description: "ID of the task to comment on",
            },
            content: {
              type: "string",
              description: "Comment content",
            },
            parent_comment_id: {
              type: "string",
              description: "ID of parent comment for replies (optional)",
            },
            user_id: {
              type: "string",
              description:
                "ID of the user creating the comment (optional, will use task creator if not provided)",
            },
          },
          required: ["task_id", "content"],
        },
      },
      {
        name: "simpletask_get_task_comments",
        description: "Get all comments for a task",
        inputSchema: {
          type: "object",
          properties: {
            task_id: {
              type: "string",
              description: "ID of the task to get comments for",
            },
            user_id: {
              type: "string",
              description:
                "ID of the user requesting comments (optional, will use task creator if not provided)",
            },
            include_deleted: {
              type: "boolean",
              description: "Include deleted comments",
              default: false,
            },
            include_replies: {
              type: "boolean",
              description: "Include reply comments",
              default: true,
            },
            sort_field: {
              type: "string",
              enum: ["created_at", "updated_at", "user_name"],
              description: "Field to sort by",
              default: "created_at",
            },
            sort_order: {
              type: "string",
              enum: ["asc", "desc"],
              description: "Sort order",
              default: "desc",
            },
            limit: {
              type: "number",
              description: "Maximum number of comments to return",
              default: 50,
            },
            offset: {
              type: "number",
              description: "Number of comments to skip",
              default: 0,
            },
          },
          required: ["task_id"],
        },
      },
      {
        name: "simpletask_update_comment",
        description: "Update an existing comment",
        inputSchema: {
          type: "object",
          properties: {
            comment_id: {
              type: "string",
              description: "ID of the comment to update",
            },
            content: {
              type: "string",
              description: "New comment content",
            },
            user_id: {
              type: "string",
              description:
                "ID of the user updating the comment (optional, will use task creator if task_id provided)",
            },
            task_id: {
              type: "string",
              description:
                "ID of the task containing the comment (optional but recommended)",
            },
          },
          required: ["comment_id", "content"],
        },
      },
      {
        name: "simpletask_delete_comment",
        description: "Delete a comment",
        inputSchema: {
          type: "object",
          properties: {
            comment_id: {
              type: "string",
              description: "ID of the comment to delete",
            },
            user_id: {
              type: "string",
              description:
                "ID of the user deleting the comment (optional, will use task creator if task_id provided)",
            },
            task_id: {
              type: "string",
              description:
                "ID of the task containing the comment (optional but recommended)",
            },
          },
          required: ["comment_id"],
        },
      },
      {
        name: "simpletask_get_comment",
        description: "Get a specific comment by ID",
        inputSchema: {
          type: "object",
          properties: {
            comment_id: {
              type: "string",
              description: "ID of the comment to retrieve",
            },
            task_id: {
              type: "string",
              description:
                "ID of the task containing the comment (optional but recommended)",
            },
          },
          required: ["comment_id"],
        },
      },
      {
        name: "simpletask_reply_to_comment",
        description: "Reply to an existing comment",
        inputSchema: {
          type: "object",
          properties: {
            parent_comment_id: {
              type: "string",
              description: "ID of the comment to reply to",
            },
            content: {
              type: "string",
              description: "Reply content",
            },
            user_id: {
              type: "string",
              description:
                "ID of the user creating the reply (optional, will use task creator if not provided)",
            },
            task_id: {
              type: "string",
              description:
                "ID of the task containing the comment (required for creating replies)",
            },
          },
          required: ["parent_comment_id", "content", "task_id"],
        },
      },
      {
        name: "simpletask_get_comment_thread",
        description: "Get a comment thread (comment and all its replies)",
        inputSchema: {
          type: "object",
          properties: {
            comment_id: {
              type: "string",
              description: "ID of the root comment",
            },
            user_id: {
              type: "string",
              description:
                "ID of the user requesting the thread (optional, will use default project user if not provided)",
            },
          },
          required: ["comment_id"],
        },
      },
      {
        name: "simpletask_get_project_comments",
        description: "Get all comments for a project",
        inputSchema: {
          type: "object",
          properties: {
            project_id: {
              type: "string",
              description: "ID of the project to get comments for",
            },
            user_id: {
              type: "string",
              description:
                "ID of the user requesting comments (optional, will use default project user if not provided)",
            },
            include_deleted: {
              type: "boolean",
              description: "Include deleted comments",
              default: false,
            },
            include_replies: {
              type: "boolean",
              description: "Include reply comments",
              default: true,
            },
            sort_field: {
              type: "string",
              enum: ["created_at", "updated_at", "user_name"],
              description: "Field to sort by",
              default: "created_at",
            },
            sort_order: {
              type: "string",
              enum: ["asc", "desc"],
              description: "Sort order",
              default: "desc",
            },
            limit: {
              type: "number",
              description: "Maximum number of comments to return",
              default: 50,
            },
            offset: {
              type: "number",
              description: "Number of comments to skip",
              default: 0,
            },
          },
          required: ["project_id"],
        },
      },
      {
        name: "simpletask_process_checklist",
        description:
          "Process the checklist for a task using AI to suggest actions or ask clarifying questions.",
        ai_instructions: [
          "Use AI to analyze checklist items and suggest actions or ask clarifying questions.",
          "Process checklist items in the order specified by their 'order' property.",
          "Skip items that are already marked as completed.",
          "Mark items as completed after processing them.",
        ],
        inputSchema: {
          type: "object",
          properties: {
            task_id: {
              type: "string",
              description:
                "ID of the task whose checklist needs to be processed.",
            },
            project_name: {
              type: "string",
              description:
                "Project name (optional, uses default if not specified).",
            },
          },
          required: ["task_id"],
        },
      },
      {
        name: "simpletask_add_checklist_item",
        description: "Add a new item to a task's checklist",
        inputSchema: {
          type: "object",
          properties: {
            task_id: {
              type: "string",
              description: "ID of the task to add checklist item to",
            },
            text: {
              type: "string",
              description: "Text content of the checklist item",
            },
            order: {
              type: "number",
              description:
                "Order position for the item (optional, will auto-assign if not provided)",
            },
            completed: {
              type: "boolean",
              description: "Completion status of the item",
              default: false,
            },
            project_name: {
              type: "string",
              description:
                "Project name (optional, uses default if not specified)",
            },
          },
          required: ["task_id", "text"],
        },
      },
      {
        name: "simpletask_update_checklist_item",
        description: "Update an existing checklist item",
        inputSchema: {
          type: "object",
          properties: {
            task_id: {
              type: "string",
              description: "ID of the task containing the checklist item",
            },
            id: {
              type: "string",
              description: "ID of the checklist item to update",
            },
            text: {
              type: "string",
              description: "New text content for the checklist item",
            },
            order: {
              type: "number",
              description: "New order position for the item",
            },
            completed: {
              type: "boolean",
              description: "New completion status of the item",
            },
            project_name: {
              type: "string",
              description:
                "Project name (optional, uses default if not specified)",
            },
          },
          required: ["task_id", "id"],
        },
      },
      {
        name: "simpletask_remove_checklist_item",
        description: "Remove an item from a task's checklist",
        inputSchema: {
          type: "object",
          properties: {
            task_id: {
              type: "string",
              description: "ID of the task to remove checklist item from",
            },
            id: {
              type: "string",
              description: "ID of the checklist item to remove",
            },
            project_name: {
              type: "string",
              description:
                "Project name (optional, uses default if not specified)",
            },
          },
          required: ["task_id", "id"],
        },
      },
      {
        name: "simpletask_get_checklist",
        description: "Get the checklist for a specific task",
        inputSchema: {
          type: "object",
          properties: {
            task_id: {
              type: "string",
              description: "ID of the task to get checklist for",
            },
            project_name: {
              type: "string",
              description:
                "Project name (optional, uses default if not specified)",
            },
          },
          required: ["task_id"],
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  if (!args) {
    return {
      content: [
        {
          type: "text",
          text: `Error: No arguments provided for tool: ${name}`,
        },
      ],
      isError: true,
    };
  }

  try {
    switch (name) {
      // Simple Task Management Tools
      case "simpletask_list_projects":
        return await handleSimpleTaskListProjects();
      case "simpletask_switch_project":
        return await handleSimpleTaskSwitchProject(args);
      case "simpletask_get_current_project":
        return await handleSimpleTaskGetCurrentProject();
      case "simpletask_find_project":
        return await handleSimpleTaskFindProject(args);
      case "simpletask_get_project_details":
        return await handleSimpleTaskGetProjectDetails(args);
      case "simpletask_create_task":
        return await handleSimpleTaskCreateTask(args);
      case "simpletask_get_tasks":
        return await handleSimpleTaskGetTasks(args);
      case "simpletask_get_tasks_summary":
        return await handleSimpleTaskGetTasksSummary(args);
      case "simpletask_get_task":
        return await handleSimpleTaskGetTask(args);
      case "simpletask_update_task":
        return await handleSimpleTaskUpdateTask(args);
      case "simpletask_update_task_status":
        return await handleSimpleTaskUpdateTaskStatus(args);
      case "simpletask_delete_task":
        return await handleSimpleTaskDeleteTask(args);
      case "simpletask_search_tasks":
        return await handleSimpleTaskSearchTasks(args);
      case "simpletask_get_tasks_by_status":
        return await handleSimpleTaskGetTasksByStatus(args);
      case "simpletask_get_tasks_by_priority":
        return await handleSimpleTaskGetTasksByPriority(args);
      case "simpletask_get_tasks_by_order_key":
        return await handleSimpleTaskGetTasksByOrderKey(args);
      case "simpletask_get_task_dependencies":
        return await handleSimpleTaskGetTaskDependencies(args);
      case "simpletask_get_task_dependents":
        return await handleSimpleTaskGetTaskDependents(args);
      case "simpletask_generate_tasks":
        return await handleSimpleTaskGenerateTasks(args);
      case "simpletask_get_project_info":
        return await handleSimpleTaskGetProjectInfo(args);
      // Task Comment Tools
      case "simpletask_create_comment":
        return await handleSimpleTaskCreateComment(args);
      case "simpletask_get_task_comments":
        return await handleSimpleTaskGetTaskComments(args);
      case "simpletask_update_comment":
        return await handleSimpleTaskUpdateComment(args);
      case "simpletask_delete_comment":
        return await handleSimpleTaskDeleteComment(args);
      case "simpletask_get_comment":
        return await handleSimpleTaskGetComment(args);
      case "simpletask_reply_to_comment":
        return await handleSimpleTaskReplyToComment(args);
      case "simpletask_get_comment_thread":
        return await handleSimpleTaskGetCommentThread(args);
      case "simpletask_get_project_comments":
        return await handleSimpleTaskGetProjectComments(args);
      case "simpletask_process_checklist":
        return await handleSimpleTaskProcessChecklist(args);
      case "simpletask_add_checklist_item":
        return await handleSimpleTaskAddChecklistItem(args);
      case "simpletask_update_checklist_item":
        return await handleSimpleTaskUpdateChecklistItem(args);
      case "simpletask_remove_checklist_item":
        return await handleSimpleTaskRemoveChecklistItem(args);
      case "simpletask_get_checklist":
        return await handleSimpleTaskGetChecklist(args);
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error executing ${name}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        },
      ],
      isError: true,
    };
  }
});

// Simple Task handler functions
async function handleSimpleTaskListProjects() {
  try {
    const projects = simpleTaskService.getAllProjects();
    const summary = simpleTaskService.getProjectsSummary();

    return {
      content: [
        {
          type: "text",
          text: `# Available Simple Task Projects\n\n${summary}\n\n## Full Project Data:\n\n${JSON.stringify(
            projects,
            null,
            2,
          )}`,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Failed to list projects: ${
            error instanceof Error ? error.message : String(error)
          }`,
        },
      ],
      isError: true,
    };
  }
}

async function handleSimpleTaskFindProject(args: any) {
  try {
    const { query } = args;
    const results = simpleTaskService.findProject(query);

    return {
      content: [
        {
          type: "text",
          text: `# Project Search Results for "${query}"\n\n${
            results.length > 0
              ? results
                  .map(
                    (project, index) =>
                      `${index + 1}. **${project.name}** (${
                        project.projectName
                      })\n   Project ID: ${project.projectId}\n   ${
                        project.description
                          ? `Description: ${project.description}`
                          : "No description"
                      }`,
                  )
                  .join("\n\n")
              : "No projects found matching your search term."
          }\n\n## Full Data:\n\n${JSON.stringify(results, null, 2)}`,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Failed to search projects: ${
            error instanceof Error ? error.message : String(error)
          }`,
        },
      ],
      isError: true,
    };
  }
}

async function handleSimpleTaskGetProjectDetails(args: any) {
  try {
    const { project_name } = args;
    const projectDetails = simpleTaskService.getProjectDetails(project_name);

    if (!projectDetails) {
      return {
        content: [
          {
            type: "text",
            text: `Project "${project_name}" not found. Available projects: ${simpleTaskService
              .getAllProjects()
              .map((p) => p.projectName)
              .join(", ")}`,
          },
        ],
        isError: true,
      };
    }

    return {
      content: [
        {
          type: "text",
          text: `# Project Details: ${
            projectDetails.name
          }\n\n**Project Name:** ${
            projectDetails.projectName
          }\n**Project ID:** ${projectDetails.projectId}\n**Description:** ${
            projectDetails.description || "No description"
          }\n\n## Full Data:\n\n${JSON.stringify(projectDetails, null, 2)}`,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Failed to get project details: ${
            error instanceof Error ? error.message : String(error)
          }`,
        },
      ],
      isError: true,
    };
  }
}

async function handleSimpleTaskCreateTask(args: any) {
  try {
    const { project_name, ...taskData } = args;
    const resolvedProject = await resolveProjectContext(project_name);

    if (!resolvedProject) {
      return generateProjectResolutionError();
    }

    const result = await simpleTaskService.createTask(
      taskData,
      resolvedProject,
    );

    // Log the project used for context
    console.log(`📝 Created task in project: ${resolvedProject}`);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Failed to create task: ${
            error instanceof Error ? error.message : String(error)
          }`,
        },
      ],
      isError: true,
    };
  }
}

async function handleSimpleTaskGetTasks(args: any) {
  try {
    const { project_name, limit, offset, include_full_data } = args || {};
    const resolvedProject = await resolveProjectContext(project_name);

    if (!resolvedProject) {
      return generateProjectResolutionError();
    }

    const result = await simpleTaskService.getTasksPaginated(
      { limit, offset, include_full_data },
      resolvedProject,
    );

    // Log the project used for context
    console.log(
      `📋 Retrieved tasks from project: ${resolvedProject} (${result.items.length}/${result.total_count})`,
    );

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Failed to get tasks: ${
            error instanceof Error ? error.message : String(error)
          }`,
        },
      ],
      isError: true,
    };
  }
}

async function handleSimpleTaskGetTasksSummary(args: any) {
  try {
    const { project_name, limit, offset } = args || {};
    const resolvedProject = await resolveProjectContext(project_name);

    if (!resolvedProject) {
      return generateProjectResolutionError();
    }

    const result = await simpleTaskService.getTasksPaginated(
      { limit, offset, include_full_data: false },
      resolvedProject,
    );

    // Log the project used for context
    console.log(
      `📋 Retrieved task summaries from project: ${resolvedProject} (${result.items.length}/${result.total_count})`,
    );

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Failed to get task summaries: ${
            error instanceof Error ? error.message : String(error)
          }`,
        },
      ],
      isError: true,
    };
  }
}

async function handleSimpleTaskGetTask(args: any) {
  try {
    const { task_id, project_name } = args;
    const resolvedProject = await resolveProjectContext(project_name);

    if (!resolvedProject) {
      return generateProjectResolutionError();
    }

    const result = await simpleTaskService.getTask(task_id, resolvedProject);

    // Log the project used for context
    console.log(`📄 Retrieved task from project: ${resolvedProject}`);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Failed to get task: ${
            error instanceof Error ? error.message : String(error)
          }`,
        },
      ],
      isError: true,
    };
  }
}

async function handleSimpleTaskUpdateTask(args: any) {
  try {
    const { task_id, project_name, ...updateData } = args;
    const resolvedProject = await resolveProjectContext(project_name);

    if (!resolvedProject) {
      return generateProjectResolutionError();
    }

    const result = await simpleTaskService.updateTask(
      task_id,
      updateData,
      resolvedProject,
    );

    // Log the project used for context
    console.log(`✏️ Updated task in project: ${resolvedProject}`);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Failed to update task: ${
            error instanceof Error ? error.message : String(error)
          }`,
        },
      ],
      isError: true,
    };
  }
}

async function handleSimpleTaskUpdateTaskStatus(args: any) {
  try {
    const { task_id, status, project_name } = args;
    const resolvedProject = await resolveProjectContext(project_name);

    if (!resolvedProject) {
      return generateProjectResolutionError();
    }

    const result = await simpleTaskService.updateTaskStatus(
      task_id,
      status,
      resolvedProject,
    );

    // Log the project used for context
    console.log(`🔄 Updated task status in project: ${resolvedProject}`);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Failed to update task status: ${
            error instanceof Error ? error.message : String(error)
          }`,
        },
      ],
      isError: true,
    };
  }
}

async function handleSimpleTaskDeleteTask(args: any) {
  try {
    const { task_id, project_name } = args;
    const resolvedProject = await resolveProjectContext(project_name);

    if (!resolvedProject) {
      return generateProjectResolutionError();
    }

    const result = await simpleTaskService.deleteTask(task_id, resolvedProject);

    // Log the project used for context
    console.log(`🗑️ Deleted task from project: ${resolvedProject}`);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Failed to delete task: ${
            error instanceof Error ? error.message : String(error)
          }`,
        },
      ],
      isError: true,
    };
  }
}

async function handleSimpleTaskSearchTasks(args: any) {
  try {
    const { query, project_name, limit, offset, include_full_data } = args;
    const resolvedProject = await resolveProjectContext(project_name);

    if (!resolvedProject) {
      return generateProjectResolutionError();
    }

    const result = await simpleTaskService.searchTasksPaginated(
      query,
      { limit, offset, include_full_data },
      resolvedProject,
    );

    // Log the project used for context
    console.log(
      `🔍 Searched tasks in project: ${resolvedProject} (${result.items.length}/${result.total_count})`,
    );

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Failed to search tasks: ${
            error instanceof Error ? error.message : String(error)
          }`,
        },
      ],
      isError: true,
    };
  }
}

async function handleSimpleTaskGetTasksByStatus(args: any) {
  try {
    const { status, project_name, limit, offset, include_full_data } = args;
    const resolvedProject = await resolveProjectContext(project_name);

    if (!resolvedProject) {
      return generateProjectResolutionError();
    }

    const result = await simpleTaskService.getTasksByStatusPaginated(
      status,
      { limit, offset, include_full_data },
      resolvedProject,
    );

    // Log the project used for context
    console.log(
      `📊 Retrieved tasks by status from project: ${resolvedProject} (${result.items.length}/${result.total_count})`,
    );

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Failed to get tasks by status: ${
            error instanceof Error ? error.message : String(error)
          }`,
        },
      ],
      isError: true,
    };
  }
}

async function handleSimpleTaskGetTasksByPriority(args: any) {
  try {
    const { priority, project_name, limit, offset, include_full_data } = args;
    const resolvedProject = await resolveProjectContext(project_name);

    if (!resolvedProject) {
      return generateProjectResolutionError();
    }

    const result = await simpleTaskService.getTasksByPriorityPaginated(
      priority,
      { limit, offset, include_full_data },
      resolvedProject,
    );

    // Log the project used for context
    console.log(
      `🔢 Retrieved tasks by priority from project: ${resolvedProject} (${result.items.length}/${result.total_count})`,
    );

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Failed to get tasks by priority: ${
            error instanceof Error ? error.message : String(error)
          }`,
        },
      ],
      isError: true,
    };
  }
}

async function handleSimpleTaskGetTasksByOrderKey(args: any) {
  try {
    const { order_key, project_name, limit, offset, include_full_data } = args;
    const resolvedProject = await resolveProjectContext(project_name);

    if (!resolvedProject) {
      return generateProjectResolutionError();
    }

    const result = await simpleTaskService.getTasksByOrderKeyPaginated(
      order_key,
      { limit, offset, include_full_data },
      resolvedProject,
    );

    // Log the project used for context
    console.log(
      `📝 Retrieved tasks by order key from project: ${resolvedProject} (${result.items.length}/${result.total_count})`,
    );

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Failed to get tasks by order key: ${
            error instanceof Error ? error.message : String(error)
          }`,
        },
      ],
      isError: true,
    };
  }
}

async function handleSimpleTaskGetTaskDependencies(args: any) {
  try {
    const { task_id, project_name } = args;
    const resolvedProject = await resolveProjectContext(project_name);

    if (!resolvedProject) {
      return generateProjectResolutionError();
    }

    const result = await simpleTaskService.getTaskDependencies(
      task_id,
      resolvedProject,
    );

    // Log the project used for context
    console.log(
      `🔗 Retrieved task dependencies from project: ${resolvedProject}`,
    );

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Failed to get task dependencies: ${
            error instanceof Error ? error.message : String(error)
          }`,
        },
      ],
      isError: true,
    };
  }
}

async function handleSimpleTaskGetTaskDependents(args: any) {
  try {
    const { task_id, project_name } = args;
    const resolvedProject = await resolveProjectContext(project_name);

    if (!resolvedProject) {
      return generateProjectResolutionError();
    }

    const result = await simpleTaskService.getTaskDependents(
      task_id,
      resolvedProject,
    );

    // Log the project used for context
    console.log(
      `🔗 Retrieved task dependents from project: ${resolvedProject}`,
    );

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Failed to get task dependents: ${
            error instanceof Error ? error.message : String(error)
          }`,
        },
      ],
      isError: true,
    };
  }
}

async function handleSimpleTaskGenerateTasks(args: any) {
  try {
    const { description, project_name } = args;
    const resolvedProject = await resolveProjectContext(project_name);

    if (!resolvedProject) {
      return generateProjectResolutionError();
    }

    const result = await simpleTaskService.generateTasks(
      description,
      resolvedProject,
    );

    // Log the project used for context
    console.log(`🤖 Generated tasks for project: ${resolvedProject}`);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Failed to generate tasks: ${
            error instanceof Error ? error.message : String(error)
          }`,
        },
      ],
      isError: true,
    };
  }
}

async function handleSimpleTaskGetProjectInfo(args: any) {
  try {
    const { project_name } = args || {};
    const result = await simpleTaskService.getProjectInfo(project_name);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Failed to get project info: ${
            error instanceof Error ? error.message : String(error)
          }`,
        },
      ],
      isError: true,
    };
  }
}

// Comment handler functions (using SimpleTaskService methods)
async function handleSimpleTaskCreateComment(args: any) {
  try {
    const resolvedProject = await resolveProjectContext();
    const result = await simpleTaskService.createComment(
      args,
      resolvedProject || undefined,
    );
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Failed to create comment: ${
            error instanceof Error ? error.message : String(error)
          }`,
        },
      ],
      isError: true,
    };
  }
}

async function handleSimpleTaskGetTaskComments(args: any) {
  try {
    const { task_id, user_id, ...options } = args;
    const resolvedProject = await resolveProjectContext();
    const result = await simpleTaskService.getTaskComments(
      task_id,
      user_id,
      options,
      resolvedProject || undefined,
    );
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Failed to get task comments: ${
            error instanceof Error ? error.message : String(error)
          }`,
        },
      ],
      isError: true,
    };
  }
}

async function handleSimpleTaskUpdateComment(args: any) {
  try {
    const { comment_id, content, user_id, task_id } = args;
    const resolvedProject = await resolveProjectContext();
    const result = await simpleTaskService.updateComment(
      comment_id,
      content,
      user_id,
      task_id,
      resolvedProject || undefined,
    );
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Failed to update comment: ${
            error instanceof Error ? error.message : String(error)
          }`,
        },
      ],
      isError: true,
    };
  }
}

async function handleSimpleTaskDeleteComment(args: any) {
  try {
    const { comment_id, user_id, task_id } = args;
    const resolvedProject = await resolveProjectContext();
    const result = await simpleTaskService.deleteComment(
      comment_id,
      user_id,
      task_id,
      resolvedProject || undefined,
    );
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Failed to delete comment: ${
            error instanceof Error ? error.message : String(error)
          }`,
        },
      ],
      isError: true,
    };
  }
}

async function handleSimpleTaskGetComment(args: any) {
  try {
    const { comment_id, task_id } = args;
    const resolvedProject = await resolveProjectContext();
    const result = await simpleTaskService.getComment(
      comment_id,
      task_id,
      resolvedProject || undefined,
    );
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Failed to get comment: ${
            error instanceof Error ? error.message : String(error)
          }`,
        },
      ],
      isError: true,
    };
  }
}

async function handleSimpleTaskReplyToComment(args: any) {
  try {
    const { parent_comment_id, content, user_id, task_id } = args;
    const resolvedProject = await resolveProjectContext();
    const result = await simpleTaskService.replyToComment(
      parent_comment_id,
      content,
      user_id,
      task_id,
      resolvedProject || undefined,
    );
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Failed to reply to comment: ${
            error instanceof Error ? error.message : String(error)
          }`,
        },
      ],
      isError: true,
    };
  }
}

async function handleSimpleTaskGetCommentThread(args: any) {
  try {
    const { comment_id, user_id } = args;
    const resolvedProject = await resolveProjectContext();
    const result = await simpleTaskService.getCommentThread(
      comment_id,
      user_id,
      resolvedProject || undefined,
    );
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Failed to get comment thread: ${
            error instanceof Error ? error.message : String(error)
          }`,
        },
      ],
      isError: true,
    };
  }
}

async function handleSimpleTaskGetProjectComments(args: any) {
  try {
    const { project_id, user_id, ...options } = args;
    const resolvedProject = await resolveProjectContext();
    const result = await simpleTaskService.getProjectComments(
      project_id,
      user_id,
      options,
      resolvedProject || undefined,
    );
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Failed to get project comments: ${
            error instanceof Error ? error.message : String(error)
          }`,
        },
      ],
      isError: true,
    };
  }
}

async function handleSimpleTaskSwitchProject(args: any) {
  try {
    const { project_identifier } = args;
    const result = switchToProject(project_identifier);

    if (result.success) {
      return {
        content: [
          {
            type: "text",
            text: `✅ ${
              result.message
            }\n\n**Current Project Details:**\n${JSON.stringify(
              result.project,
              null,
              2,
            )}`,
          },
        ],
      };
    } else {
      return {
        content: [
          {
            type: "text",
            text: `❌ ${result.message}`,
          },
        ],
        isError: true,
      };
    }
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Failed to switch project: ${
            error instanceof Error ? error.message : String(error)
          }`,
        },
      ],
      isError: true,
    };
  }
}

async function handleSimpleTaskGetCurrentProject() {
  try {
    const currentProject = await resolveProjectContext();
    const projectDetails = currentProject
      ? simpleTaskService.getProjectDetails(currentProject)
      : null;

    let statusMessage = "";
    if (sessionContext.detectedFromWorkspace) {
      statusMessage = "🔍 Auto-detected from workspace project.json";
    } else if (sessionContext.currentProject) {
      statusMessage = "🎯 Manually selected via session context";
    } else {
      statusMessage = "📌 Using default project";
    }

    if (projectDetails) {
      return {
        content: [
          {
            type: "text",
            text: `# Current Active Project\n\n**${projectDetails.name}** (${
              projectDetails.projectName
            })\n\n**Status:** ${statusMessage}\n**Project ID:** ${
              projectDetails.projectId
            }\n**Description:** ${
              projectDetails.description || "No description"
            }\n\n## Full Data:\n\n${JSON.stringify(projectDetails, null, 2)}`,
          },
        ],
      };
    } else {
      return {
        content: [
          {
            type: "text",
            text: "❌ No current project found. Use `simpletask_switch_project` to select a project or `simpletask_list_projects` to see available options.",
          },
        ],
        isError: true,
      };
    }
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Failed to get current project: ${
            error instanceof Error ? error.message : String(error)
          }`,
        },
      ],
      isError: true,
    };
  }
}

async function handleSimpleTaskProcessChecklist(args: any) {
  const { task_id, project_name } = args;

  try {
    const resolvedProjectName = await resolveProjectContext(project_name);

    if (!resolvedProjectName) {
      return generateProjectResolutionError();
    }

    // Use the SimpleTaskService to process the checklist
    await simpleTaskService.processChecklist(task_id, resolvedProjectName);

    return {
      content: [
        {
          type: "text",
          text: `✅ Successfully processed the checklist for task ID: ${task_id}`,
        },
      ],
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return {
      content: [
        {
          type: "text",
          text: `❌ Failed to process the checklist: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
}

async function handleSimpleTaskAddChecklistItem(args: any) {
  try {
    const { task_id, text, order, completed = false, project_name } = args;
    const resolvedProject = await resolveProjectContext(project_name);

    if (!resolvedProject) {
      return generateProjectResolutionError();
    }

    const result = await simpleTaskService.addChecklistItem(
      task_id,
      text,
      order,
      completed,
      resolvedProject,
    );

    // Log the project used for context
    console.log(
      `✅ Added checklist item to task in project: ${resolvedProject}`,
    );

    return {
      content: [
        {
          type: "text",
          text: `✅ Successfully added checklist item to task ${task_id}\n\n${JSON.stringify(
            result,
            null,
            2,
          )}`,
        },
      ],
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return {
      content: [
        {
          type: "text",
          text: `❌ Failed to add checklist item: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
}

async function handleSimpleTaskUpdateChecklistItem(args: any) {
  const { task_id, id, text, order, completed, project_name } = args;

  try {
    const resolvedProjectName = await resolveProjectContext(project_name);

    if (!resolvedProjectName) {
      return generateProjectResolutionError();
    }

    const updates: any = {};
    if (text !== undefined) updates.text = text;
    if (order !== undefined) updates.order = order;
    if (completed !== undefined) updates.completed = completed;

    const result = await simpleTaskService.updateChecklistItem(
      task_id,
      id,
      updates,
      resolvedProjectName,
    );

    return {
      content: [
        {
          type: "text",
          text: `✅ Successfully updated checklist item ${id} in task ${task_id}\n\n${JSON.stringify(
            result,
            null,
            2,
          )}`,
        },
      ],
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return {
      content: [
        {
          type: "text",
          text: `❌ Failed to update checklist item: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
}

async function handleSimpleTaskRemoveChecklistItem(args: any) {
  const { task_id, id, project_name } = args;

  try {
    const resolvedProjectName = await resolveProjectContext(project_name);

    if (!resolvedProjectName) {
      return generateProjectResolutionError();
    }

    const result = await simpleTaskService.removeChecklistItem(
      task_id,
      id,
      resolvedProjectName,
    );

    return {
      content: [
        {
          type: "text",
          text: `✅ Successfully removed checklist item ${id} from task ${task_id}\n\n${JSON.stringify(
            result,
            null,
            2,
          )}`,
        },
      ],
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return {
      content: [
        {
          type: "text",
          text: `❌ Failed to remove checklist item: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
}

async function handleSimpleTaskGetChecklist(args: any) {
  const { task_id, project_name } = args;

  try {
    const resolvedProjectName = await resolveProjectContext(project_name);

    if (!resolvedProjectName) {
      return generateProjectResolutionError();
    }

    const checklist = await simpleTaskService.getChecklist(
      task_id,
      resolvedProjectName,
    );

    return {
      content: [
        {
          type: "text",
          text: `📋 Checklist for task ${task_id}:\n\n${JSON.stringify(
            checklist,
            null,
            2,
          )}`,
        },
      ],
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return {
      content: [
        {
          type: "text",
          text: `❌ Failed to get checklist: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
}

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.log("✅ Simple Task MCP Server running on stdio");
}

main().catch((error) => {
  console.error("❌ Fatal error in main():", error);
  process.exit(1);
});
