import path from "path";
import { fileURLToPath } from "url";
import { SimpleTaskService } from "../src/services/simpletask";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const configPath = path.resolve(__dirname, "../projects.json");
  const baseUrl = process.env.SMOKE_BASE_URL ?? "https://publicapi-5kr4fylsmq-uc.a.run.app";
  const service = SimpleTaskService.fromProjectsJson(configPath, { baseUrl });

  const desiredProjectName = process.env.SMOKE_PROJECT ?? "eduaxios";
  const projectDefinition =
    service.getProjectDetails(desiredProjectName) ?? service.getDefaultProject();

  if (!projectDefinition) {
    throw new Error(`No project configuration found (looked for ${desiredProjectName})`);
  }

  const projectName = projectDefinition.projectName;
  console.log(`Using project: ${projectName}`);

  const projectInfo = await service.getProjectInfo(projectName);
  if (!projectInfo) {
    throw new Error("Project info request returned no data");
  }

  const ownerId = projectInfo.owner_id;
  if (!ownerId) {
    console.log("Project info response:", projectInfo);
    throw new Error("Project owner_id not found in project info response");
  }
  console.log("Fetched project info");

  const taskTitle = `MCP smoke task ${new Date().toISOString()}`;
  const createdTask = await service.createTask(
    {
      title: taskTitle,
      description: "Smoke test via MCP service",
      priority: "medium",
      status: "todo",
      checklist: [],
    },
    projectName,
  );
  if (!createdTask?.id) {
    throw new Error("Failed to create task");
  }
  console.log(`Created task ${createdTask.id}`);

  const updatedTask = await service.updateTask(
    createdTask.id,
    {
      status: "in_progress",
      priority: "high",
      checklist: [
        { id: "step-1", text: "First step", order: 0, completed: false },
        { id: "step-2", text: "Second step", order: 1, completed: false },
      ],
    },
    projectName,
  );
  console.log(
    `Updated task status to ${updatedTask.status}, priority to ${updatedTask.priority}`,
  );

  const commentResponse = await service.createComment(
    {
      task_id: createdTask.id,
      content: "Smoke test comment",
      user_id: ownerId,
    },
    projectName,
  );
  const createdCommentId = commentResponse?.comment?.id || commentResponse?.id;
  if (!createdCommentId) {
    throw new Error("Failed to create comment");
  }
  console.log(`Created comment ${createdCommentId}`);

  const commentsResponse = await service.getTaskComments(
    createdTask.id,
    ownerId,
    {},
    projectName,
  );
  const commentsList = Array.isArray(commentsResponse)
    ? commentsResponse
    : commentsResponse?.comments || [];
  console.log(`Fetched ${commentsList.length} comment(s)`);

  await service.updateComment(
    createdCommentId,
    "Smoke test comment (updated)",
    ownerId,
    createdTask.id,
    projectName,
  );
  console.log("Updated comment");

  await service.deleteComment(
    createdCommentId,
    ownerId,
    createdTask.id,
    projectName,
  );
  console.log("Deleted comment");

  await service.deleteTask(createdTask.id, projectName);
  console.log("Deleted task");

  console.log("✅ MCP smoke test completed successfully");
}

main().catch((err) => {
  console.error("❌ MCP smoke test failed:", err);
  process.exit(1);
});
