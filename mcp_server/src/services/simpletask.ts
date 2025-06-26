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
  created_at: string;
  updated_at: string;
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
    task: Task,
    projectName?: string,
  ): Promise<TaskSearchResult> {
    const projectConfig = this.getProjectConfig(projectName);
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

  // Comment methods
  async createComment(args: {
    task_id: string;
    content: string;
    parent_comment_id?: string;
    user_id: string;
  }): Promise<any> {
    return this.makeRequest(`/tasks/${args.task_id}/comments`, "POST", args);
  }

  async getTaskComments(
    task_id: string,
    user_id: string,
    options: any = {},
  ): Promise<any> {
    const queryParams = new URLSearchParams({
      user_id,
      ...options,
    });
    return this.makeRequest(`/tasks/${task_id}/comments?${queryParams}`, "GET");
  }

  async updateComment(
    comment_id: string,
    content: string,
    user_id: string,
  ): Promise<any> {
    return this.makeRequest(`/comments/${comment_id}`, "PUT", {
      content,
      user_id,
    });
  }

  async deleteComment(comment_id: string, user_id: string): Promise<any> {
    return this.makeRequest(`/comments/${comment_id}`, "DELETE", { user_id });
  }

  async getComment(comment_id: string): Promise<any> {
    return this.makeRequest(`/comments/${comment_id}`, "GET");
  }

  async replyToComment(
    parent_comment_id: string,
    content: string,
    user_id: string,
  ): Promise<any> {
    return this.makeRequest(`/comments/${parent_comment_id}/replies`, "POST", {
      content,
      user_id,
    });
  }

  async getCommentThread(comment_id: string, user_id: string): Promise<any> {
    const queryParams = new URLSearchParams({ user_id });
    return this.makeRequest(
      `/comments/${comment_id}/thread?${queryParams}`,
      "GET",
    );
  }

  async getProjectComments(
    project_id: string,
    user_id: string,
    options: any = {},
  ): Promise<any> {
    const queryParams = new URLSearchParams({
      user_id,
      ...options,
    });
    return this.makeRequest(
      `/projects/${project_id}/comments?${queryParams}`,
      "GET",
    );
  }
}
