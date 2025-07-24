import fetch from "node-fetch";
import fs from "fs";

export interface SimpleTaskConfig {
  apiKey: string;
  baseUrl: string;
  projectId: string;
}

export interface ProjectConfig {
  [projectName: string]: {
    apiKey: string;
    projectId: string;
  };
}

export interface ProjectDefinition {
  name: string;
  projectName: string;
  apiKey: string;
  projectId: string;
  description?: string;
}

export interface ChecklistItem {
  id: string;
  text: string;
  order: number;
  completed: boolean;
}

export interface Task {
  id?: string;
  title: string;
  description: string;
  priority?: "low" | "medium" | "high";
  status?: "todo" | "in_progress" | "review" | "completed" | "blocked";
  order_key?: string;
  depends_on?: string[];
  due_date?: string | null;
  assigned_to?: string | null;
  created_at?: string;
  updated_at?: string;
  checklist?: ChecklistItem[];
}

export interface TaskSearchResult {
  id: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  order_key: string;
  depends_on: string[];
  due_date: string | null;
  assigned_to: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  checklist?: ChecklistItem[];
}

export class SimpleTaskService {
  private config: SimpleTaskConfig;
  private projects: ProjectConfig;
  private projectDefinitions: ProjectDefinition[];

  constructor(
    config: SimpleTaskConfig,
    projects: ProjectConfig = {},
    projectDefinitions: ProjectDefinition[] = [],
  ) {
    this.config = config;
    this.projects = projects;
    this.projectDefinitions = projectDefinitions;
  }

  // Static method to create service from JSON configuration
  static fromProjectsJson(
    projectsJsonPath: string,
    defaultConfig?: Partial<SimpleTaskConfig>,
  ): SimpleTaskService {
    try {
      const projectDefinitions: ProjectDefinition[] = JSON.parse(
        fs.readFileSync(projectsJsonPath, "utf8"),
      );

      if (projectDefinitions.length === 0) {
        throw new Error("No projects found in projects.json");
      }

      const projects: ProjectConfig = {};
      projectDefinitions.forEach((project) => {
        projects[project.projectName] = {
          apiKey: project.apiKey,
          projectId: project.projectId,
        };
        console.log(
          `📋 Configured project: ${project.projectName} (${project.name})`,
        );
      });

      // Use first project as default if no default config provided
      const firstProject = projectDefinitions[0];
      const config: SimpleTaskConfig = {
        apiKey: defaultConfig?.apiKey || firstProject.apiKey,
        baseUrl:
          defaultConfig?.baseUrl ||
          "https://wimojwdsqtwzouddsujd.supabase.co/functions/v1/api-v1",
        projectId: defaultConfig?.projectId || firstProject.projectId,
      };

      console.log(
        `📋 Using default project: ${firstProject.projectName} (${firstProject.name})`,
      );
      return new SimpleTaskService(config, projects, projectDefinitions);
    } catch (error) {
      console.error(
        `Failed to load projects from JSON: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      throw new Error("projects.json file is required but could not be loaded");
    }
  }

  // Get project configuration by name, fallback to default
  private getProjectConfig(projectName?: string): {
    apiKey: string;
    projectId: string;
    baseUrl: string;
  } {
    if (projectName && this.projects[projectName]) {
      return {
        ...this.projects[projectName],
        baseUrl: this.config.baseUrl,
      };
    }

    return {
      apiKey: this.config.apiKey,
      projectId: this.config.projectId,
      baseUrl: this.config.baseUrl,
    };
  }

  // Get all available projects with their details
  getAllProjects(): ProjectDefinition[] {
    return this.projectDefinitions;
  }

  // Get project details by project name
  getProjectDetails(projectName: string): ProjectDefinition | null {
    return (
      this.projectDefinitions.find((p) => p.projectName === projectName) || null
    );
  }

  // Get the default project
  getDefaultProject(): ProjectDefinition | null {
    return this.projectDefinitions.length > 0
      ? this.projectDefinitions[0]
      : null;
  }

  // Find project by partial name match or description
  findProject(query: string): ProjectDefinition[] {
    const searchTerm = query.toLowerCase();
    return this.projectDefinitions.filter(
      (project) =>
        project.name.toLowerCase().includes(searchTerm) ||
        project.projectName.toLowerCase().includes(searchTerm) ||
        (project.description &&
          project.description.toLowerCase().includes(searchTerm)),
    );
  }

  // Get project summary for AI context
  getProjectsSummary(): string {
    if (this.projectDefinitions.length === 0) {
      return "No projects configured.";
    }

    const defaultProject = this.getDefaultProject();
    let summary = `Available projects (${this.projectDefinitions.length}):\n\n`;

    this.projectDefinitions.forEach((project, index) => {
      const isDefault = defaultProject?.projectName === project.projectName;
      summary += `${index + 1}. **${project.name}** (${project.projectName})${
        isDefault ? " [DEFAULT]" : ""
      }\n`;
      if (project.description) {
        summary += `   Description: ${project.description}\n`;
      }
      summary += `   Project ID: ${project.projectId}\n\n`;
    });

    summary += `Default project: ${defaultProject?.name} (${defaultProject?.projectName})\n`;
    summary += `Use project_name parameter to specify a different project, or omit to use default.`;

    return summary;
  }

  private async makeRequest(
    endpoint: string,
    method: string = "GET",
    body?: any,
    projectName?: string,
  ): Promise<any> {
    const projectConfig = this.getProjectConfig(projectName);
    const url = `${projectConfig.baseUrl}${endpoint}`;
    const headers = {
      Authorization: `Bearer ${projectConfig.apiKey}`,
      "Content-Type": "application/json",
    };

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API request failed: ${response.status} - ${errorText}`);
    }

    return await response.json();
  }

  // Create a new task
  async createTask(
    task: Task & { created_by?: string }, // Allow created_by to be provided
    projectName?: string,
  ): Promise<TaskSearchResult> {
    const projectConfig = this.getProjectConfig(projectName);
    
    // If created_by not provided, try to get a default user_id from existing tasks
    if (!task.created_by) {
      try {
        task.created_by = await this.getDefaultUserId(projectName);
      } catch (error) {
        // If we can't get a default user_id, let the API handle it
        console.warn(`Could not resolve default user_id for task creation: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    
    const result = await this.makeRequest(
      `/projects/${projectConfig.projectId}/tasks`,
      "POST",
      task,
      projectName,
    );
    return result.task;
  }

  // Get all tasks for the project
  async getTasks(projectName?: string): Promise<TaskSearchResult[]> {
    const projectConfig = this.getProjectConfig(projectName);
    const result = await this.makeRequest(
      `/projects/${projectConfig.projectId}/tasks`,
      "GET",
      undefined,
      projectName,
    );
    return result.tasks || [];
  }

  // Get a specific task by ID
  async getTask(
    taskId: string,
    projectName?: string,
  ): Promise<TaskSearchResult> {
    const projectConfig = this.getProjectConfig(projectName);
    const result = await this.makeRequest(
      `/projects/${projectConfig.projectId}/tasks/${taskId}`,
      "GET",
      undefined,
      projectName,
    );
    return result.task;
  }

  // Update a task
  async updateTask(
    taskId: string,
    updates: Partial<Task>,
    projectName?: string,
  ): Promise<TaskSearchResult> {
    const projectConfig = this.getProjectConfig(projectName);
    const result = await this.makeRequest(
      `/projects/${projectConfig.projectId}/tasks/${taskId}`,
      "PUT",
      updates,
      projectName,
    );
    return result.task;
  }

  // Delete a task
  async deleteTask(
    taskId: string,
    projectName?: string,
  ): Promise<{ message: string }> {
    const projectConfig = this.getProjectConfig(projectName);
    const result = await this.makeRequest(
      `/projects/${projectConfig.projectId}/tasks/${taskId}`,
      "DELETE",
      undefined,
      projectName,
    );
    return result;
  }

  // Search tasks by title or description
  async searchTasks(
    query: string,
    projectName?: string,
  ): Promise<TaskSearchResult[]> {
    const tasks = await this.getTasks(projectName);
    const searchTerm = query.toLowerCase();

    return tasks.filter(
      (task) =>
        task.title.toLowerCase().includes(searchTerm) ||
        task.description.toLowerCase().includes(searchTerm),
    );
  }

  // Get tasks by status
  async getTasksByStatus(
    status: string,
    projectName?: string,
  ): Promise<TaskSearchResult[]> {
    const tasks = await this.getTasks(projectName);
    return tasks.filter((task) => task.status === status);
  }

  // Get tasks by priority
  async getTasksByPriority(
    priority: string,
    projectName?: string,
  ): Promise<TaskSearchResult[]> {
    const tasks = await this.getTasks(projectName);
    return tasks.filter((task) => task.priority === priority);
  }

  // Get tasks by order key (useful for finding tasks in sequence)
  async getTasksByOrderKey(
    orderKey: string,
    projectName?: string,
  ): Promise<TaskSearchResult[]> {
    const tasks = await this.getTasks(projectName);
    return tasks.filter((task) => task.order_key === orderKey);
  }

  // Get task dependencies - find all tasks that depend on a given task
  async getTaskDependents(
    taskId: string,
    projectName?: string,
  ): Promise<TaskSearchResult[]> {
    const tasks = await this.getTasks(projectName);
    return tasks.filter((task) => task.depends_on.includes(taskId));
  }

  // Get tasks that a given task depends on
  async getTaskDependencies(
    taskId: string,
    projectName?: string,
  ): Promise<TaskSearchResult[]> {
    const task = await this.getTask(taskId, projectName);
    if (!task.depends_on || task.depends_on.length === 0) {
      return [];
    }

    const dependencies = [];
    for (const depId of task.depends_on) {
      try {
        const depTask = await this.getTask(depId, projectName);
        dependencies.push(depTask);
      } catch (error) {
        console.warn(`Could not fetch dependency ${depId}:`, error);
      }
    }
    return dependencies;
  }

  // Update task status
  async updateTaskStatus(
    taskId: string,
    status: "todo" | "in_progress" | "review" | "completed" | "blocked",
    projectName?: string,
  ): Promise<TaskSearchResult> {
    return this.updateTask(taskId, { status }, projectName);
  }

  // Generate tasks using AI
  async generateTasks(
    description: string,
    projectName?: string,
  ): Promise<{ message: string; tasks: TaskSearchResult[] }> {
    const projectConfig = this.getProjectConfig(projectName);
    const result = await this.makeRequest(
      `/projects/${projectConfig.projectId}/ai/generate-tasks`,
      "POST",
      { description },
      projectName,
    );
    return result;
  }

  // Get project info
  async getProjectInfo(projectName?: string): Promise<any> {
    const projectConfig = this.getProjectConfig(projectName);
    const result = await this.makeRequest(
      `/projects/${projectConfig.projectId}`,
      "GET",
      undefined,
      projectName,
    );
    return result.project;
  }

  // List available projects
  listProjects(): string[] {
    const projectNames = Object.keys(this.projects);
    if (this.config.apiKey && this.config.projectId) {
      projectNames.unshift("default");
    }
    return projectNames;
  }

  // Helper method to get user_id from task creator
  private async getTaskCreatorUserId(
    taskId: string,
    projectName?: string,
  ): Promise<string> {
    try {
      const task = await this.getTask(taskId, projectName);
      if (!task.created_by) {
        throw new Error(`Task ${taskId} does not have a created_by field`);
      }
      return task.created_by;
    } catch (error) {
      throw new Error(
        `Failed to get task creator for task ${taskId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  // Helper method to get a default user_id from any existing task in the project
  private async getDefaultUserId(projectName?: string): Promise<string> {
    try {
      const tasks = await this.getTasks(projectName);
      if (tasks.length === 0) {
        throw new Error("No tasks found in project to determine default user_id");
      }
      
      // Use the created_by from the first task as default
      const defaultUserId = tasks[0].created_by;
      if (!defaultUserId) {
        throw new Error("Found tasks but no created_by field");
      }
      
      return defaultUserId;
    } catch (error) {
      throw new Error(
        `Failed to get default user_id: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  // Comment methods
  async createComment(
    args: {
      task_id: string;
      content: string;
      parent_comment_id?: string;
      user_id?: string; // Made optional - will be resolved from task creator
    },
    projectName?: string,
  ): Promise<any> {
    const projectConfig = this.getProjectConfig(projectName);
    
    // If user_id not provided, get it from the task creator
    const user_id = args.user_id || await this.getTaskCreatorUserId(args.task_id, projectName);
    
    const commentArgs = {
      ...args,
      user_id,
    };
    
    return this.makeRequest(
      `/projects/${projectConfig.projectId}/tasks/${args.task_id}/comments`,
      "POST",
      commentArgs,
      projectName,
    );
  }

  async getTaskComments(
    task_id: string,
    user_id?: string, // Made optional - will be resolved from task creator
    options: any = {},
    projectName?: string,
  ): Promise<any> {
    const projectConfig = this.getProjectConfig(projectName);
    
    // If user_id not provided, get it from the task creator
    const resolvedUserId = user_id || await this.getTaskCreatorUserId(task_id, projectName);
    
    const queryParams = new URLSearchParams({
      user_id: resolvedUserId,
      ...options,
    });
    return this.makeRequest(
      `/projects/${projectConfig.projectId}/tasks/${task_id}/comments?${queryParams}`,
      "GET",
      undefined,
      projectName,
    );
  }

  async updateComment(
    comment_id: string,
    content: string,
    user_id?: string, // Made optional - will be resolved from task creator if task_id provided
    task_id?: string,
    projectName?: string,
  ): Promise<any> {
    const projectConfig = this.getProjectConfig(projectName);
    
    // If user_id not provided and we have task_id, get it from the task creator
    const resolvedUserId = user_id || (task_id ? await this.getTaskCreatorUserId(task_id, projectName) : undefined);
    
    if (!resolvedUserId) {
      throw new Error("user_id is required when task_id is not provided");
    }
    
    // We need task_id for the correct endpoint, but we can try the comment-only endpoint as fallback
    if (task_id) {
      return this.makeRequest(
        `/projects/${projectConfig.projectId}/tasks/${task_id}/comments/${comment_id}`,
        "PUT",
        {
          content,
          user_id: resolvedUserId,
        },
        projectName,
      );
    } else {
      return this.makeRequest(
        `/projects/${projectConfig.projectId}/comments/${comment_id}`,
        "PUT",
        {
          content,
          user_id: resolvedUserId,
        },
        projectName,
      );
    }
  }

  async deleteComment(
    comment_id: string,
    user_id?: string, // Made optional - will be resolved from task creator if task_id provided
    task_id?: string,
    projectName?: string,
  ): Promise<any> {
    const projectConfig = this.getProjectConfig(projectName);
    
    // If user_id not provided and we have task_id, get it from the task creator
    const resolvedUserId = user_id || (task_id ? await this.getTaskCreatorUserId(task_id, projectName) : undefined);
    
    if (!resolvedUserId) {
      throw new Error("user_id is required when task_id is not provided");
    }
    
    // We need task_id for the correct endpoint, but we can try the comment-only endpoint as fallback
    if (task_id) {
      return this.makeRequest(
        `/projects/${projectConfig.projectId}/tasks/${task_id}/comments/${comment_id}`,
        "DELETE",
        { user_id: resolvedUserId },
        projectName,
      );
    } else {
      return this.makeRequest(
        `/projects/${projectConfig.projectId}/comments/${comment_id}`,
        "DELETE",
        { user_id: resolvedUserId },
        projectName,
      );
    }
  }

  async getComment(
    comment_id: string,
    task_id?: string,
    projectName?: string,
  ): Promise<any> {
    const projectConfig = this.getProjectConfig(projectName);
    // We need task_id for the correct endpoint, but we can try the comment-only endpoint as fallback
    if (task_id) {
      return this.makeRequest(
        `/projects/${projectConfig.projectId}/tasks/${task_id}/comments/${comment_id}`,
        "GET",
        undefined,
        projectName,
      );
    } else {
      return this.makeRequest(
        `/projects/${projectConfig.projectId}/comments/${comment_id}`,
        "GET",
        undefined,
        projectName,
      );
    }
  }

  async replyToComment(
    parent_comment_id: string,
    content: string,
    user_id?: string, // Made optional - will be resolved from task creator
    task_id?: string, // Made optional but recommended for performance
    projectName?: string,
  ): Promise<any> {
    const projectConfig = this.getProjectConfig(projectName);
    // Replies are created using the same endpoint as regular comments, but with parent_comment_id
    // We need task_id to construct the proper endpoint
    if (!task_id) {
      throw new Error("task_id is required for creating comment replies");
    }
    
    // If user_id not provided, get it from the task creator
    const resolvedUserId = user_id || await this.getTaskCreatorUserId(task_id, projectName);
    
    return this.makeRequest(
      `/projects/${projectConfig.projectId}/tasks/${task_id}/comments`,
      "POST",
      {
        content,
        user_id: resolvedUserId,
        parent_comment_id,
      },
      projectName,
    );
  }

  async getCommentThread(
    comment_id: string,
    user_id?: string, // Made optional - will use default user if not provided
    projectName?: string,
  ): Promise<any> {
    const projectConfig = this.getProjectConfig(projectName);
    
    // If user_id not provided, get a default user_id
    const resolvedUserId = user_id || await this.getDefaultUserId(projectName);
    
    const queryParams = new URLSearchParams({ user_id: resolvedUserId });
    return this.makeRequest(
      `/projects/${projectConfig.projectId}/comments/${comment_id}/thread?${queryParams}`,
      "GET",
      undefined,
      projectName,
    );
  }

  async getProjectComments(
    project_id: string,
    user_id?: string, // Made optional - will use default user if not provided
    options: any = {},
    projectName?: string,
  ): Promise<any> {
    const projectConfig = this.getProjectConfig(projectName);
    
    // If user_id not provided, get a default user_id
    const resolvedUserId = user_id || await this.getDefaultUserId(projectName);
    
    const queryParams = new URLSearchParams({
      user_id: resolvedUserId,
      ...options,
    });
    // Use the provided project_id directly instead of getting it from config
    // This method allows querying comments from a specific project by ID
    return this.makeRequest(
      `/projects/${project_id}/comments?${queryParams}`,
      "GET",
      undefined,
      projectName,
    );
  }

  // Process the checklist for a task
  async processChecklist(
    taskId: string,
    projectName?: string
  ): Promise<void> {
    const task = await this.getTask(taskId, projectName);

    if (!task.checklist || !Array.isArray(task.checklist)) {
      throw new Error("Checklist is missing or invalid.");
    }

    // Sort checklist items by order
    const sortedChecklist = task.checklist.sort((a, b) => a.order - b.order);

    for (const item of sortedChecklist) {
      if (item.completed) {
        continue; // Skip completed items
      }

      // Suggest how to complete the item or ask for clarification
      console.log(`Processing checklist item: ${item.text}`);
      // TODO: Add AI logic to suggest or ask for clarification

      // Mark the item as completed
      item.completed = true;

      // Update the task with the modified checklist
      await this.updateTask(taskId, { checklist: task.checklist }, projectName);

      // Break after processing one item to ensure order is respected
      break;
    }
  }

  // Add a new item to a task's checklist
  async addChecklistItem(
    taskId: string,
    text: string,
    order?: number,
    completed: boolean = false,
    projectName?: string
  ): Promise<TaskSearchResult> {
    const task = await this.getTask(taskId, projectName);
    
    // Initialize checklist if it doesn't exist
    if (!task.checklist) {
      task.checklist = [];
    }

    // Auto-assign order if not provided
    if (order === undefined) {
      order = task.checklist.length > 0 ? Math.max(...task.checklist.map(item => item.order)) + 1 : 0;
    }

    // Generate a new ID for the checklist item
    const newItem = {
      id: crypto.randomUUID(),
      text,
      order,
      completed
    };

    task.checklist.push(newItem);
    
    return await this.updateTask(taskId, { checklist: task.checklist }, projectName);
  }

  // Update an existing checklist item
  async updateChecklistItem(
    taskId: string,
    itemId: string,
    updates: { text?: string; order?: number; completed?: boolean },
    projectName?: string
  ): Promise<TaskSearchResult> {
    const task = await this.getTask(taskId, projectName);
    
    if (!task.checklist || !Array.isArray(task.checklist)) {
      throw new Error("Task has no checklist.");
    }

    const itemIndex = task.checklist.findIndex(item => item.id === itemId);
    if (itemIndex === -1) {
      throw new Error(`Checklist item with ID ${itemId} not found.`);
    }

    // Update the item with provided values
    if (updates.text !== undefined) {
      task.checklist[itemIndex].text = updates.text;
    }
    if (updates.order !== undefined) {
      task.checklist[itemIndex].order = updates.order;
    }
    if (updates.completed !== undefined) {
      task.checklist[itemIndex].completed = updates.completed;
    }

    return await this.updateTask(taskId, { checklist: task.checklist }, projectName);
  }

  // Remove an item from a task's checklist
  async removeChecklistItem(
    taskId: string,
    itemId: string,
    projectName?: string
  ): Promise<TaskSearchResult> {
    const task = await this.getTask(taskId, projectName);
    
    if (!task.checklist || !Array.isArray(task.checklist)) {
      throw new Error("Task has no checklist.");
    }

    const itemIndex = task.checklist.findIndex(item => item.id === itemId);
    if (itemIndex === -1) {
      throw new Error(`Checklist item with ID ${itemId} not found.`);
    }

    // Remove the item
    task.checklist.splice(itemIndex, 1);

    return await this.updateTask(taskId, { checklist: task.checklist }, projectName);
  }

  // Get the checklist for a specific task
  async getChecklist(
    taskId: string,
    projectName?: string
  ): Promise<ChecklistItem[]> {
    const task = await this.getTask(taskId, projectName);
    
    if (!task.checklist) {
      return [];
    }

    // Return checklist sorted by order
    return task.checklist.sort((a, b) => a.order - b.order);
  }
}
