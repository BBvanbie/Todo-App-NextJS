import { getAuthenticatedUserId } from "@/lib/auth-guard";
import { errorJson, getRequestId, okJson } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";
import { ensureTodoDeletedAtColumn } from "@/lib/todo-soft-delete";
import { resolveWorkspaceForUser } from "@/lib/workspace";

function parseId(id: string): number | null {
  const parsed = Number(id);
  if (!Number.isInteger(parsed) || parsed <= 0) return null;
  return parsed;
}

export async function GET(
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
    const existing = await prisma.$queryRaw<Array<{ id: number }>>`
      SELECT "id"
      FROM "Todo"
      WHERE "id" = ${todoId}
        AND "workspaceId" = ${workspace.workspaceId}
        AND "deletedAt" IS NULL
      LIMIT 1
    `;
    if (!existing[0]) {
      return errorJson({
        status: 404,
        code: "TODO_NOT_FOUND",
        message: "Todo not found.",
        requestId,
      });
    }

    const histories = await prisma.todoEditHistory.findMany({
      where: { todoId },
      orderBy: { editedAt: "desc" },
      take: 100,
      select: { id: true, editedAt: true },
    });

    return okJson(histories, { requestId });
  } catch (error) {
    console.error(`[${requestId}] GET /api/todos/${todoId}/edits failed:`, error);
    return errorJson({
      status: 500,
      code: "TODO_EDITS_FETCH_FAILED",
      message: "Failed to fetch edit histories.",
      requestId,
    });
  }
}
