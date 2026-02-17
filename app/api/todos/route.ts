import { getAuthenticatedUserId } from "@/lib/auth-guard";
import { errorJson, getRequestId, okJson } from "@/lib/api-response";
import { writeAuditLog } from "@/lib/audit-log";
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
} from "@/lib/todo-status";
import { TodoPriority } from "@/src/generated/prisma";

type CreateTodoInput = {
  title?: unknown;
  startAt?: unknown;
  dueAt?: unknown;
  memo?: unknown;
  category?: unknown;
  priority?: unknown;
  status?: unknown;
  assigneeUserId?: unknown;
};

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

function parseBooleanQuery(value: string | null): boolean | undefined {
  if (value === null) return undefined;
  if (value === "true") return true;
  if (value === "false") return false;
  return undefined;
}

function isInvalidDateRange(startAt: Date | null, dueAt: Date) {
  return startAt !== null && startAt.getTime() > dueAt.getTime();
}

export async function GET(request: Request) {
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

  try {
    await ensureTodoCategoryColumnText();
    await ensureTodoStatusColumn();
    await ensureTodoAssigneeColumn();
    await ensureTodoStartAtColumn();
    await ensureTodoDeletedAtColumn();

    const url = new URL(request.url);
    const q = url.searchParams.get("q")?.trim() ?? "";
    const categoryRaw = url.searchParams.get("category");
    const priorityRaw = url.searchParams.get("priority");
    const statusRaw = url.searchParams.get("status");
    const assigneeRaw = url.searchParams.get("assignee");
    const dueFromRaw = url.searchParams.get("dueFrom");
    const dueToRaw = url.searchParams.get("dueTo");
    const completedRaw = url.searchParams.get("completed");

    const whereClauses: string[] = ['"userId" = $1'];
    const values: unknown[] = [userId];
    const nextParam = (value: unknown) => {
      values.push(value);
      return `$${values.length}`;
    };
    whereClauses.push('"deletedAt" IS NULL');

    if (q) {
      const pattern = `%${q}%`;
      const p1 = nextParam(pattern);
      const p2 = nextParam(pattern);
      whereClauses.push(`("title" ILIKE ${p1} OR COALESCE("memo", '') ILIKE ${p2})`);
    }

    if (categoryRaw && categoryRaw !== "ALL") {
      const category = normalizeCategoryInput(categoryRaw);
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
      const p = nextParam(category);
      whereClauses.push(`"category" = ${p}`);
    }

    if (priorityRaw && priorityRaw !== "ALL") {
      const priority = parsePriority(priorityRaw);
      if (!priority) {
        return errorJson({
          status: 400,
          code: "INVALID_PRIORITY",
          message: "priority is invalid.",
          requestId,
        });
      }
      const p = nextParam(priority);
      whereClauses.push(`"priority" = ${p}::"TodoPriority"`);
    }

    if (statusRaw && statusRaw !== "ALL") {
      const status = normalizeTodoStatusInput(statusRaw);
      if (!status) {
        return errorJson({
          status: 400,
          code: "INVALID_STATUS",
          message: "status is invalid.",
          requestId,
        });
      }
      const p = nextParam(status);
      whereClauses.push(`"status" = ${p}`);
    }

    if (assigneeRaw === "SELF") {
      const p = nextParam(userId);
      whereClauses.push(`"assigneeUserId" = ${p}`);
    } else if (assigneeRaw === "UNASSIGNED") {
      whereClauses.push(`"assigneeUserId" IS NULL`);
    }

    if (completedRaw !== null) {
      const completed = parseBooleanQuery(completedRaw);
      if (completed === undefined) {
        return errorJson({
          status: 400,
          code: "INVALID_COMPLETED",
          message: "completed must be true or false.",
          requestId,
        });
      }
      const p = nextParam(completed);
      whereClauses.push(`"completed" = ${p}`);
    }

    if (dueFromRaw) {
      const dueFrom = new Date(dueFromRaw);
      if (Number.isNaN(dueFrom.getTime())) {
        return errorJson({
          status: 400,
          code: "INVALID_DUE_FROM",
          message: "dueFrom must be a valid datetime string.",
          requestId,
        });
      }
      const p = nextParam(dueFrom);
      whereClauses.push(`"dueAt" >= ${p}`);
    }

    if (dueToRaw) {
      const dueTo = new Date(dueToRaw);
      if (Number.isNaN(dueTo.getTime())) {
        return errorJson({
          status: 400,
          code: "INVALID_DUE_TO",
          message: "dueTo must be a valid datetime string.",
          requestId,
        });
      }
      const p = nextParam(dueTo);
      whereClauses.push(`"dueAt" <= ${p}`);
    }

    const todos = await prisma.$queryRawUnsafe<
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
    >(
      `
      SELECT *
      FROM "Todo"
      WHERE ${whereClauses.join(" AND ")}
      ORDER BY "completed" ASC, "dueAt" ASC, "createdAt" DESC
      `,
      ...values,
    );

    return okJson(todos, { requestId });
  } catch (error) {
    console.error(`[${requestId}] GET /api/todos failed:`, error);
    return errorJson({
      status: 500,
      code: "TODOS_FETCH_FAILED",
      message: "Failed to fetch todos.",
      requestId,
    });
  }
}

export async function POST(request: Request) {
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

  try {
    await ensureTodoCategoryColumnText();
    await ensureTodoStatusColumn();
    await ensureTodoAssigneeColumn();
    await ensureTodoStartAtColumn();
    await ensureTodoDeletedAtColumn();

    const body = (await request.json()) as CreateTodoInput;

    if (typeof body.title !== "string" || body.title.trim().length === 0) {
      return errorJson({
        status: 400,
        code: "INVALID_TITLE",
        message: "title is required.",
        requestId,
      });
    }

    const dueAt = parseDueAt(body.dueAt);
    if (dueAt === null || dueAt === undefined) {
      return errorJson({
        status: 400,
        code: "INVALID_DUE_AT",
        message: "dueAt is required and must be a valid ISO datetime string.",
        requestId,
      });
    }

    const parsedStartAt = parseStartAt(body.startAt);
    if (body.startAt !== undefined && parsedStartAt === undefined) {
      return errorJson({
        status: 400,
        code: "INVALID_START_AT",
        message: "startAt must be a valid ISO datetime string.",
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

    const category = body.category === undefined ? "OTHER" : normalizeCategoryInput(body.category);
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

    const priority = body.priority === undefined ? TodoPriority.MEDIUM : parsePriority(body.priority);
    if (priority === undefined) {
      return errorJson({
        status: 400,
        code: "INVALID_PRIORITY",
        message: "priority is invalid.",
        requestId,
      });
    }

    const status = body.status === undefined ? "OPEN" : normalizeTodoStatusInput(body.status);
    if (!status) {
      return errorJson({
        status: 400,
        code: "INVALID_STATUS",
        message: "status is invalid.",
        requestId,
      });
    }
    const completed = completedFromStatus(status);
    const completedAt = completed ? new Date() : null;
    const assigneeUserId =
      body.assigneeUserId === undefined
        ? userId
        : parseAssigneeInput(body.assigneeUserId, userId);
    if (assigneeUserId === undefined) {
      return errorJson({
        status: 400,
        code: "INVALID_ASSIGNEE",
        message: "assigneeUserId is invalid.",
        requestId,
      });
    }
    const startAt = parsedStartAt === undefined || parsedStartAt === null ? new Date() : parsedStartAt;
    if (isInvalidDateRange(startAt, dueAt)) {
      return errorJson({
        status: 400,
        code: "INVALID_DATE_RANGE",
        message: "startAt must be earlier than or equal to dueAt.",
        requestId,
      });
    }

    const inserted = await prisma.$queryRaw<
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
        ${body.title.trim()},
        ${memo ?? null},
        ${category},
        ${priority}::"TodoPriority",
        ${status},
        ${assigneeUserId},
        ${completed},
        ${startAt},
        ${dueAt},
        ${completedAt},
        NOW(),
        NOW()
      )
      RETURNING *
    `;

    await writeAuditLog({
      actorUserId: userId,
      action: "TODO_CREATE",
      targetType: "TODO",
      targetId: String(inserted[0].id),
      requestId,
      request,
      diff: {
        before: null,
        after: inserted[0] as Record<string, unknown>,
      },
    });

    return okJson(inserted[0], { status: 201, requestId });
  } catch (error) {
    console.error(`[${requestId}] POST /api/todos failed:`, error);
    const detail = error instanceof Error ? error.message : "unknown error";
    return errorJson({
      status: 500,
      code: "TODO_CREATE_FAILED",
      message: "Failed to create todo.",
      details: detail,
      requestId,
    });
  }
}
