import { getAuthenticatedUserId } from "@/lib/auth-guard";
import { errorJson, getRequestId, okJson } from "@/lib/api-response";
import { sanitizeForAudit, writeAuditLog } from "@/lib/audit-log";
import {
  ensureTodoCategoryColumnText,
  isAllowedCategory,
  normalizeCategoryInput,
} from "@/lib/categories";
import { prisma } from "@/lib/prisma";
import { ensureTodoAssigneeColumn, parseAssigneeInput } from "@/lib/todo-assignee";
import { ensureTodoStartAtColumn } from "@/lib/todo-start-at";
import { ensureTodoDeletedAtColumn } from "@/lib/todo-soft-delete";
import {
  completedFromStatus,
  ensureTodoStatusColumn,
  normalizeTodoStatusInput,
  statusFromCompleted,
} from "@/lib/todo-status";
import { TodoPriority } from "@/src/generated/prisma";

type DuplicateTodoInput = {
  dueAt?: unknown;
  startAt?: unknown;
  title?: unknown;
  memo?: unknown;
  category?: unknown;
  priority?: unknown;
  status?: unknown;
  assigneeUserId?: unknown;
};

function parseId(id: string): number | null {
  const parsed = Number(id);
  if (!Number.isInteger(parsed) || parsed <= 0) return null;
  return parsed;
}

function parseDateTime(value: unknown): Date | undefined {
  if (typeof value !== "string") return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date;
}

function parseOptionalDateTime(value: unknown): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  return parseDateTime(value);
}

function parseTitle(value: unknown): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (trimmed.length === 0) return undefined;
  return trimmed;
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
  if (value === undefined) return undefined;
  if (typeof value !== "string") return undefined;
  return Object.values(TodoPriority).includes(value as TodoPriority)
    ? (value as TodoPriority)
    : undefined;
}

function isInvalidDateRange(startAt: Date | null, dueAt: Date) {
  return startAt !== null && startAt.getTime() > dueAt.getTime();
}

export async function POST(
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

    const body = (await request.json()) as DuplicateTodoInput;
    const dueAt = parseDateTime(body.dueAt);
    if (!dueAt) {
      return errorJson({
        status: 400,
        code: "INVALID_DUE_AT",
        message: "dueAt is required and must be a valid ISO datetime string.",
        requestId,
      });
    }
    const startAt = parseOptionalDateTime(body.startAt);
    if (body.startAt !== undefined && startAt === undefined) {
      return errorJson({
        status: 400,
        code: "INVALID_START_AT",
        message: "startAt must be a valid ISO datetime string or null.",
        requestId,
      });
    }

    const existingRows = await prisma.$queryRaw<
      Array<{
        id: number;
        userId: string | null;
        title: string;
        memo: string | null;
        category: string;
        priority: "HIGH" | "MEDIUM" | "LOW";
        status: "OPEN" | "IN_PROGRESS" | "BLOCKED" | "DONE";
        assigneeUserId: string | null;
        completed: boolean;
        startAt: Date | null;
        dueAt: Date;
        completedAt: Date | null;
        deletedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
      }>
    >`
      SELECT *
      FROM "Todo"
      WHERE "id" = ${todoId}
        AND "userId" = ${userId}
        AND "deletedAt" IS NULL
      LIMIT 1
    `;
    const existing = existingRows[0];
    if (!existing) {
      return errorJson({
        status: 404,
        code: "TODO_NOT_FOUND",
        message: "Todo not found.",
        requestId,
      });
    }

    const title = parseTitle(body.title);
    if (body.title !== undefined && !title) {
      return errorJson({
        status: 400,
        code: "INVALID_TITLE",
        message: "title must be a non-empty string.",
        requestId,
      });
    }

    const memo = parseMemo(body.memo);
    if (body.memo !== undefined && memo === undefined) {
      return errorJson({
        status: 400,
        code: "INVALID_MEMO",
        message: "memo must be a string or null.",
        requestId,
      });
    }

    const category =
      body.category === undefined ? undefined : normalizeCategoryInput(body.category);
    if (body.category !== undefined && !category) {
      return errorJson({
        status: 400,
        code: "INVALID_CATEGORY",
        message: "category is invalid.",
        requestId,
      });
    }

    if (category && !(await isAllowedCategory(userId, category))) {
      return errorJson({
        status: 400,
        code: "CATEGORY_NOT_ALLOWED",
        message: "選択したカテゴリは使用できません。",
        requestId,
      });
    }

    const priority = parsePriority(body.priority);
    if (body.priority !== undefined && !priority) {
      return errorJson({
        status: 400,
        code: "INVALID_PRIORITY",
        message: "priority is invalid.",
        requestId,
      });
    }

    const status = body.status === undefined ? undefined : normalizeTodoStatusInput(body.status);
    if (body.status !== undefined && !status) {
      return errorJson({
        status: 400,
        code: "INVALID_STATUS",
        message: "status is invalid.",
        requestId,
      });
    }
    const sourceStatus = existing.status ?? statusFromCompleted(existing.completed);
    const finalStatus = status ?? sourceStatus;
    const completed = completedFromStatus(finalStatus);
    const completedAt = completed ? new Date() : null;
    const effectiveStartAt = startAt === undefined ? (existing.startAt ?? new Date()) : startAt;
    if (isInvalidDateRange(effectiveStartAt, dueAt)) {
      return errorJson({
        status: 400,
        code: "INVALID_DATE_RANGE",
        message: "startAt must be earlier than or equal to dueAt.",
        requestId,
      });
    }
    const assigneeUserId =
      body.assigneeUserId === undefined
        ? existing.assigneeUserId ?? userId
        : parseAssigneeInput(body.assigneeUserId, userId);
    if (assigneeUserId === undefined) {
      return errorJson({
        status: 400,
        code: "INVALID_ASSIGNEE",
        message: "assigneeUserId is invalid.",
        requestId,
      });
    }

    const duplicated = await prisma.$queryRaw<
      Array<{
        id: number;
        userId: string | null;
        title: string;
        memo: string | null;
        category: string;
        priority: string;
        status: "OPEN" | "IN_PROGRESS" | "BLOCKED" | "DONE";
        assigneeUserId: string | null;
        completed: boolean;
        startAt: Date | null;
        dueAt: Date;
        completedAt: Date | null;
        deletedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
      }>
    >`
      INSERT INTO "Todo" (
        "userId",
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
        "createdAt",
        "updatedAt"
      )
      VALUES (
        ${userId},
        ${title ?? existing.title},
        ${memo === undefined ? existing.memo : memo},
        ${category ?? existing.category},
        ${String(priority ?? existing.priority)}::"TodoPriority",
        ${finalStatus},
        ${assigneeUserId},
        ${completed},
        ${effectiveStartAt},
        ${dueAt},
        ${completedAt},
        NOW(),
        NOW()
      )
      RETURNING *
    `;

    await writeAuditLog({
      actorUserId: userId,
      action: "TODO_DUPLICATE",
      targetType: "TODO",
      targetId: String(duplicated[0].id),
      requestId,
      request,
      diff: {
        before: sanitizeForAudit(existing) as Record<string, unknown>,
        after: sanitizeForAudit(duplicated[0]) as Record<string, unknown>,
        metadata: { sourceTodoId: existing.id },
      },
    });

    return okJson(duplicated[0], { status: 201, requestId });
  } catch (error) {
    console.error(`[${requestId}] POST /api/todos/${todoId}/duplicate failed:`, error);
    return errorJson({
      status: 500,
      code: "TODO_DUPLICATE_FAILED",
      message: "Failed to duplicate todo.",
      requestId,
    });
  }
}
