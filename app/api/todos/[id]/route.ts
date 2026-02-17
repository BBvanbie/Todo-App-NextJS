import { NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/lib/auth-guard";
import { sanitizeForAudit, writeAuditLog } from "@/lib/audit-log";
import { errorJson, getRequestId, okJson } from "@/lib/api-response";
import {
  ensureTodoCategoryColumnText,
  isAllowedCategory,
  normalizeCategoryInput,
} from "@/lib/categories";
import { prisma } from "@/lib/prisma";
import { ensureTodoAssigneeColumn, parseAssigneeInput } from "@/lib/todo-assignee";
import { ensureTodoStartAtColumn } from "@/lib/todo-start-at";
import { ensureTodoDeletedAtColumn } from "@/lib/todo-soft-delete";
import { resolveWorkspaceForUser } from "@/lib/workspace";
import {
  completedFromStatus,
  ensureTodoStatusColumn,
  normalizeTodoStatusInput,
  statusFromCompleted,
} from "@/lib/todo-status";
import { TodoPriority } from "@/src/generated/prisma";

type UpdateTodoInput = {
  title?: unknown;
  completed?: unknown;
  status?: unknown;
  assigneeUserId?: unknown;
  startAt?: unknown;
  dueAt?: unknown;
  memo?: unknown;
  category?: unknown;
  priority?: unknown;
};

function parseId(id: string): number | null {
  const parsed = Number(id);
  if (!Number.isInteger(parsed) || parsed <= 0) return null;
  return parsed;
}

function parseDueAt(value: unknown): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  if (typeof value !== "string") return undefined;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date;
}

function parseStartAt(value: unknown): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  if (typeof value !== "string") return undefined;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date;
}

function parseMemo(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "string") return undefined;

  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  return trimmed;
}

function parsePriority(value: unknown): TodoPriority | undefined {
  if (typeof value !== "string") return undefined;
  return Object.values(TodoPriority).includes(value as TodoPriority)
    ? (value as TodoPriority)
    : undefined;
}

function isInvalidDateRange(startAt: Date | null | undefined, dueAt: Date | undefined) {
  if (startAt === undefined || dueAt === undefined || startAt === null) return false;
  return startAt.getTime() > dueAt.getTime();
}

type TodoRow = {
  id: number;
  userId: string | null;
  deletedAt: Date | null;
  title: string;
  memo: string | null;
  category: string;
  priority: "HIGH" | "MEDIUM" | "LOW";
  status: "OPEN" | "IN_PROGRESS" | "BLOCKED" | "DONE";
  assigneeUserId: string | null;
  completed: boolean;
  dueAt: Date;
  startAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

function buildTodoChanges(before: TodoRow, after: TodoRow) {
  const keys: Array<keyof TodoRow> = [
    "title",
    "memo",
    "category",
    "priority",
    "status",
    "assigneeUserId",
    "completed",
    "startAt",
    "dueAt",
    "completedAt",
  ];
  const changes: Record<string, { before: unknown; after: unknown }> = {};
  for (const key of keys) {
    const prev = sanitizeForAudit(before[key]);
    const next = sanitizeForAudit(after[key]);
    if (JSON.stringify(prev) !== JSON.stringify(next)) {
      changes[String(key)] = { before: prev, after: next };
    }
  }
  return changes;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const requestId = getRequestId(request);
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return errorJson({
      status: 401,
      code: "UNAUTHORIZED",
      message: "Unauthorized.",
      requestId,
    });
  }

  const { id } = await params;
  const todoId = parseId(id);
  if (!todoId) {
    return errorJson({
      status: 400,
      code: "INVALID_ID",
      message: "Invalid id.",
      requestId,
    });
  }

  try {
    await ensureTodoCategoryColumnText();
    await ensureTodoStatusColumn();
    await ensureTodoAssigneeColumn();
    await ensureTodoStartAtColumn();
    await ensureTodoDeletedAtColumn();
    const workspace = await resolveWorkspaceForUser(userId, new URL(request.url).searchParams.get("ws"));
    if (!workspace) {
      return errorJson({
        status: 403,
        code: "WORKSPACE_FORBIDDEN",
        message: "Forbidden workspace.",
        requestId,
      });
    }
    const workspaceId = workspace.workspaceId;

    const body = (await request.json()) as UpdateTodoInput;
    const shouldLogEdit =
      body.title !== undefined ||
      body.dueAt !== undefined ||
      body.startAt !== undefined ||
      body.memo !== undefined ||
      body.category !== undefined ||
      body.priority !== undefined ||
      body.status !== undefined ||
      body.assigneeUserId !== undefined;

    const data: {
      title?: string;
      memo?: string | null;
      category?: string;
      priority?: TodoPriority;
      status?: "OPEN" | "IN_PROGRESS" | "BLOCKED" | "DONE";
      assigneeUserId?: string | null;
      completed?: boolean;
      dueAt?: Date;
      startAt?: Date | null;
      completedAt?: Date | null;
    } = {};

    if (body.title !== undefined) {
      if (typeof body.title !== "string" || body.title.trim().length === 0) {
        return errorJson({
          status: 400,
          code: "INVALID_TITLE",
          message: "title must be a non-empty string.",
          requestId,
        });
      }
      data.title = body.title.trim();
    }

    if (body.completed !== undefined && typeof body.completed !== "boolean") {
      return errorJson({
        status: 400,
        code: "INVALID_COMPLETED",
        message: "completed must be a boolean.",
        requestId,
      });
    }

    const parsedStatus =
      body.status === undefined ? undefined : normalizeTodoStatusInput(body.status);
    if (body.status !== undefined && parsedStatus === null) {
      return errorJson({
        status: 400,
        code: "INVALID_STATUS",
        message: "status is invalid.",
        requestId,
      });
    }
    const status = parsedStatus ?? undefined;

    if (status !== undefined && body.completed !== undefined) {
      const expectedCompleted = completedFromStatus(status);
      if (expectedCompleted !== body.completed) {
        return errorJson({
          status: 400,
          code: "STATUS_COMPLETED_CONFLICT",
          message: "status and completed conflict.",
          requestId,
        });
      }
    }

    if (status !== undefined) {
      data.status = status;
      data.completed = completedFromStatus(status);
      data.completedAt = data.completed ? new Date() : null;
    } else if (body.completed !== undefined) {
      const nextStatus = statusFromCompleted(body.completed);
      data.status = nextStatus;
      data.completed = body.completed;
      data.completedAt = body.completed ? new Date() : null;
    }

    if (body.dueAt !== undefined) {
      const dueAt = parseDueAt(body.dueAt);
      if (dueAt === null || dueAt === undefined) {
        return errorJson({
          status: 400,
          code: "INVALID_DUE_AT",
          message: "dueAt must be a valid ISO datetime string.",
          requestId,
        });
      }
      data.dueAt = dueAt;
    }

    if (body.startAt !== undefined) {
      const startAt = parseStartAt(body.startAt);
      if (startAt === undefined) {
        return errorJson({
          status: 400,
          code: "INVALID_START_AT",
          message: "startAt must be a valid ISO datetime string or null.",
          requestId,
        });
      }
      data.startAt = startAt;
    }

    if (isInvalidDateRange(data.startAt, data.dueAt)) {
      return errorJson({
        status: 400,
        code: "INVALID_DATE_RANGE",
        message: "startAt must be earlier than or equal to dueAt.",
        requestId,
      });
    }

    if (body.memo !== undefined) {
      const memo = parseMemo(body.memo);
      if (memo === undefined) {
        return errorJson({
          status: 400,
          code: "INVALID_MEMO",
          message: "memo must be a string or null.",
          requestId,
        });
      }
      data.memo = memo;
    }

    if (body.category !== undefined) {
      const category = normalizeCategoryInput(body.category);
      if (!category) {
        return errorJson({
          status: 400,
          code: "INVALID_CATEGORY",
          message: "category is invalid.",
          requestId,
        });
      }
      if (!(await isAllowedCategory(userId, category))) {
        return errorJson({
          status: 400,
          code: "CATEGORY_NOT_ALLOWED",
          message: "選択したカテゴリは使用できません。",
          requestId,
        });
      }
      data.category = category;
    }

    if (body.priority !== undefined) {
      const priority = parsePriority(body.priority);
      if (priority === undefined) {
        return errorJson({
          status: 400,
          code: "INVALID_PRIORITY",
          message: "priority is invalid.",
          requestId,
        });
      }
      data.priority = priority;
    }

    if (body.assigneeUserId !== undefined) {
      const assigneeUserId = parseAssigneeInput(body.assigneeUserId, userId);
      if (assigneeUserId === undefined) {
        return errorJson({
          status: 400,
          code: "INVALID_ASSIGNEE",
          message: "assigneeUserId is invalid.",
          requestId,
        });
      }
      data.assigneeUserId = assigneeUserId;
    }

    if (Object.keys(data).length === 0) {
      return errorJson({
        status: 400,
        code: "NO_UPDATABLE_FIELDS",
        message: "No updatable fields provided.",
        requestId,
      });
    }

    const beforeRows = await prisma.$queryRaw<Array<TodoRow>>`
      SELECT *
      FROM "Todo"
      WHERE "id" = ${todoId}
        AND "workspaceId" = ${workspaceId}
        AND "deletedAt" IS NULL
      LIMIT 1
    `;
    const beforeTodo = beforeRows[0];
    if (!beforeTodo) {
      return errorJson({
        status: 404,
        code: "TODO_NOT_FOUND",
        message: "Todo not found.",
        requestId,
      });
    }

    const nextStartAt = data.startAt === undefined ? beforeTodo.startAt : data.startAt;
    const nextDueAt = data.dueAt ?? beforeTodo.dueAt;
    if (nextStartAt !== null && nextStartAt.getTime() > nextDueAt.getTime()) {
      return errorJson({
        status: 400,
        code: "INVALID_DATE_RANGE",
        message: "startAt must be earlier than or equal to dueAt.",
        requestId,
      });
    }

    const setClauses: string[] = [];
    const values: unknown[] = [];

    if (data.title !== undefined) {
      values.push(data.title);
      setClauses.push(`"title" = $${values.length}`);
    }
    if (data.memo !== undefined) {
      values.push(data.memo);
      setClauses.push(`"memo" = $${values.length}`);
    }
    if (data.category !== undefined) {
      values.push(data.category);
      setClauses.push(`"category" = $${values.length}`);
    }
    if (data.priority !== undefined) {
      values.push(data.priority);
      setClauses.push(`"priority" = $${values.length}::"TodoPriority"`);
    }
    if (data.status !== undefined) {
      values.push(data.status);
      setClauses.push(`"status" = $${values.length}`);
    }
    if (data.assigneeUserId !== undefined) {
      values.push(data.assigneeUserId);
      setClauses.push(`"assigneeUserId" = $${values.length}`);
    }
    if (data.completed !== undefined) {
      values.push(data.completed);
      setClauses.push(`"completed" = $${values.length}`);
    }
    if (data.dueAt !== undefined) {
      values.push(data.dueAt);
      setClauses.push(`"dueAt" = $${values.length}`);
    }
    if (data.startAt !== undefined) {
      values.push(data.startAt);
      setClauses.push(`"startAt" = $${values.length}`);
    }
    if (data.completedAt !== undefined) {
      values.push(data.completedAt);
      setClauses.push(`"completedAt" = $${values.length}`);
    }

    values.push(todoId);
    const idIndex = values.length;
    values.push(workspaceId);
    const workspaceIdIndex = values.length;

    const updatedCount = await prisma.$executeRawUnsafe(
      `
      UPDATE "Todo"
      SET ${setClauses.join(", ")},
          "updatedAt" = NOW()
      WHERE "id" = $${idIndex}
        AND "workspaceId" = $${workspaceIdIndex}
        AND "deletedAt" IS NULL
      `,
      ...values,
    );

    if (updatedCount === 0) {
      return errorJson({
        status: 404,
        code: "TODO_NOT_FOUND",
        message: "Todo not found.",
        requestId,
      });
    }

    if (shouldLogEdit) {
      await prisma.$executeRaw`
        INSERT INTO "TodoEditHistory" ("todoId", "userId")
        VALUES (${todoId}, ${userId})
      `;
    }

    const todoRows = await prisma.$queryRaw<Array<TodoRow>>`
      SELECT *
      FROM "Todo"
      WHERE "id" = ${todoId}
        AND "workspaceId" = ${workspaceId}
        AND "deletedAt" IS NULL
      LIMIT 1
    `;
    const todo = todoRows[0];
    if (!todo) {
      return errorJson({
        status: 404,
        code: "TODO_NOT_FOUND",
        message: "Todo not found.",
        requestId,
      });
    }

    const action =
      beforeTodo.completed === false && todo.completed === true
        ? "TODO_COMPLETE"
        : beforeTodo.completed === true && todo.completed === false
          ? "TODO_REOPEN"
          : "TODO_UPDATE";
    const changes = buildTodoChanges(beforeTodo, todo);

    await writeAuditLog({
      actorUserId: userId,
      action,
      targetType: "TODO",
      targetId: String(todoId),
      requestId,
      request,
      diff: {
        before: sanitizeForAudit(beforeTodo) as Record<string, unknown>,
        after: sanitizeForAudit(todo) as Record<string, unknown>,
        changes,
      },
    });

    return okJson(todo, { requestId });
  } catch (error) {
    console.error(`[${requestId}] PATCH /api/todos/${todoId} failed:`, error);
    const detail = error instanceof Error ? error.message : "unknown error";
    return errorJson({
      status: 500,
      code: "TODO_UPDATE_FAILED",
      message: "Failed to update todo.",
      details: detail,
      requestId,
    });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const requestId = getRequestId(request);
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return errorJson({
      status: 401,
      code: "UNAUTHORIZED",
      message: "Unauthorized.",
      requestId,
    });
  }

  const { id } = await params;
  const todoId = parseId(id);
  if (!todoId) {
    return errorJson({
      status: 400,
      code: "INVALID_ID",
      message: "Invalid id.",
      requestId,
    });
  }

  try {
    await ensureTodoDeletedAtColumn();
    const workspace = await resolveWorkspaceForUser(userId, new URL(request.url).searchParams.get("ws"));
    if (!workspace) {
      return errorJson({
        status: 403,
        code: "WORKSPACE_FORBIDDEN",
        message: "Forbidden workspace.",
        requestId,
      });
    }
    const deletedRows = await prisma.$queryRaw<Array<TodoRow>>`
      UPDATE "Todo"
      SET "deletedAt" = NOW(),
          "updatedAt" = NOW()
      WHERE "id" = ${todoId}
        AND "workspaceId" = ${workspace.workspaceId}
        AND "deletedAt" IS NULL
      RETURNING *
    `;
    const deleted = deletedRows[0];
    if (!deleted) {
      return errorJson({
        status: 404,
        code: "TODO_NOT_FOUND",
        message: "Todo not found.",
        requestId,
      });
    }

    await writeAuditLog({
      actorUserId: userId,
      action: "TODO_DELETE",
      targetType: "TODO",
      targetId: String(todoId),
      requestId,
      request,
      diff: {
        before: sanitizeForAudit(deleted) as Record<string, unknown>,
        after: null,
      },
    });

    const response = new NextResponse(null, { status: 204 });
    response.headers.set("x-request-id", requestId);
    return response;
  } catch (error) {
    console.error(`[${requestId}] DELETE /api/todos/${todoId} failed:`, error);
    const detail = error instanceof Error ? error.message : "unknown error";
    return errorJson({
      status: 500,
      code: "TODO_DELETE_FAILED",
      message: "Failed to delete todo.",
      details: detail,
      requestId,
    });
  }
}
