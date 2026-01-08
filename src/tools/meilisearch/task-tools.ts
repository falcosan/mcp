import { z } from "zod";
import apiClient from "../../utils/api-handler.js";
import { createErrorResponse } from "../../utils/error-handler.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

/**
 * Meilisearch Task Management Tools
 *
 * This module implements MCP tools for managing tasks in Meilisearch.
 */

// Define types for task parameters
interface ListTasksParams {
  limit?: number;
  from?: number;
  statuses?: string[];
  types?: string[];
  indexUids?: string[];
  uids?: number[];
}

interface GetTaskParams {
  taskUid: number;
}

interface CancelTasksParams {
  statuses?: string[];
  types?: string[];
  indexUids?: string[];
  uids?: number[];
}

interface WaitForTaskParams {
  taskUid: number;
  timeoutMs?: number;
  intervalMs?: number;
}

/**
 * Register task management tools with the MCP server
 *
 * @param server - The MCP server instance
 */
export const registerTaskTools = (server: McpServer) => {
  // List all tasks
  server.registerTool(
    "list-tasks",
    {
      description: "List all tasks in the Meilisearch instance",
      inputSchema: {
        limit: z
          .number()
          .min(0)
          .optional()
          .describe("Maximum number of tasks to return"),
        from: z
          .number()
          .min(0)
          .optional()
          .describe("Task uid from which to start fetching"),
        statuses: z
          .array(
            z.enum([
              "enqueued",
              "processing",
              "succeeded",
              "failed",
              "canceled",
            ])
          )
          .optional()
          .describe("Statuses of tasks to return"),
        types: z
          .array(
            z.enum([
              "indexCreation",
              "indexUpdate",
              "indexDeletion",
              "documentAddition",
              "documentUpdate",
              "documentDeletion",
              "settingsUpdate",
              "dumpCreation",
              "taskCancelation",
            ])
          )
          .optional()
          .describe("Types of tasks to return"),
        indexUids: z
          .array(z.string())
          .optional()
          .describe("UIDs of the indexes on which tasks were performed"),
        uids: z
          .array(z.number())
          .optional()
          .describe("UIDs of specific tasks to return"),
      },
      _meta: { category: "meilisearch" },
    },
    async ({
      limit,
      from,
      statuses,
      types,
      indexUids,
      uids,
    }: ListTasksParams) => {
      try {
        const params: Record<string, unknown> = {};
        if (limit !== undefined) params.limit = limit;
        if (from !== undefined) params.from = from;
        if (statuses && statuses.length > 0)
          params.statuses = statuses.join(",");
        if (types && types.length > 0) params.types = types.join(",");
        if (indexUids && indexUids.length > 0)
          params.indexUids = indexUids.join(",");
        if (uids && uids.length > 0) params.uids = uids.join(",");

        const response = await apiClient.get("/tasks", { params });
        return {
          content: [
            { type: "text", text: JSON.stringify(response.data, null, 2) },
          ],
        };
      } catch (error) {
        return createErrorResponse(error);
      }
    }
  );

  server.registerTool(
    "get-task",
    {
      description: "Get information about a specific task",
      inputSchema: {
        taskUid: z.number().describe("Unique identifier of the task"),
      },
      _meta: { category: "meilisearch" },
    },
    async ({ taskUid }: GetTaskParams) => {
      try {
        const response = await apiClient.get(`/tasks/${taskUid}`);
        return {
          content: [
            { type: "text", text: JSON.stringify(response.data, null, 2) },
          ],
        };
      } catch (error) {
        return createErrorResponse(error);
      }
    }
  );

  server.registerTool(
    "cancel-tasks",
    {
      description: "Cancel tasks based on provided filters",
      inputSchema: {
        statuses: z
          .array(z.enum(["enqueued", "processing"]))
          .optional()
          .describe("Statuses of tasks to cancel"),
        types: z
          .array(
            z.enum([
              "indexCreation",
              "indexUpdate",
              "indexDeletion",
              "documentAddition",
              "documentUpdate",
              "documentDeletion",
              "settingsUpdate",
              "dumpCreation",
              "taskCancelation",
            ])
          )
          .optional()
          .describe("Types of tasks to cancel"),
        indexUids: z
          .array(z.string())
          .optional()
          .describe(
            "UIDs of the indexes on which tasks to cancel were performed"
          ),
        uids: z
          .array(z.number())
          .optional()
          .describe("UIDs of the tasks to cancel"),
      },
      _meta: { category: "meilisearch" },
    },
    async ({ statuses, types, indexUids, uids }: CancelTasksParams) => {
      try {
        const body: Record<string, unknown> = {};
        if (statuses && statuses.length > 0) body.statuses = statuses;
        if (types && types.length > 0) body.types = types;
        if (indexUids && indexUids.length > 0) body.indexUids = indexUids;
        if (uids && uids.length > 0) body.uids = uids;

        const response = await apiClient.post("/tasks/cancel", body);
        return {
          content: [
            { type: "text", text: JSON.stringify(response.data, null, 2) },
          ],
        };
      } catch (error) {
        return createErrorResponse(error);
      }
    }
  );

  server.registerTool(
    "wait-for-task",
    {
      description: "Wait for a specific task to complete",
      inputSchema: {
        taskUid: z
          .number()
          .describe("Unique identifier of the task to wait for"),
        timeoutMs: z
          .number()
          .min(0)
          .optional()
          .describe("Maximum time to wait in milliseconds (default: 5000)"),
        intervalMs: z
          .number()
          .min(100)
          .optional()
          .describe("Polling interval in milliseconds (default: 500)"),
      },
      _meta: { category: "meilisearch" },
    },
    async ({
      taskUid,
      timeoutMs = 5000,
      intervalMs = 500,
    }: WaitForTaskParams) => {
      try {
        const startTime = Date.now();
        let taskCompleted = false;
        let taskData = null;

        while (!taskCompleted && Date.now() - startTime < timeoutMs) {
          const response = await apiClient.get(`/tasks/${taskUid}`);
          taskData = response.data;

          if (
            ["succeeded", "failed", "canceled"].includes(response.statusText)
          ) {
            taskCompleted = true;
          } else {
            await new Promise((resolve) => setTimeout(resolve, intervalMs));
          }
        }

        if (!taskCompleted) {
          return {
            content: [
              {
                type: "text",
                text: `Task ${taskUid} did not complete within the timeout period of ${timeoutMs}ms`,
              },
            ],
          };
        }

        return {
          content: [{ type: "text", text: JSON.stringify(taskData, null, 2) }],
        };
      } catch (error) {
        return createErrorResponse(error);
      }
    }
  );
};

export default registerTaskTools;
