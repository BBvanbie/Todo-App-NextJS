import { getAuthenticatedUserId } from "@/lib/auth-guard";
import { errorJson, getRequestId, okJson } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";
import { ensureTodoDeletedAtColumn } from "@/lib/todo-soft-delete";
import { resolveWorkspaceForUser } from "@/lib/workspace";

type StatsRow = {
  total: bigint;
  pending: bigint;
  completed: bigint;
  dueSoon: bigint;
  overdue: bigint;
};

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
    await ensureTodoDeletedAtColumn();
    const url = new URL(request.url);
    const workspace = await resolveWorkspaceForUser(userId, url.searchParams.get("ws"));
    if (!workspace) {
      return errorJson({
        status: 403,
        code: "WORKSPACE_FORBIDDEN",
        message: "Forbidden workspace.",
        requestId,
      });
    }
    const rows = await prisma.$queryRaw<StatsRow[]>`
      SELECT
        COUNT(*)::bigint AS "total",
        COUNT(*) FILTER (WHERE "completed" = false)::bigint AS "pending",
        COUNT(*) FILTER (WHERE "completed" = true)::bigint AS "completed",
        COUNT(*) FILTER (
          WHERE "completed" = false
            AND ("dueAt" AT TIME ZONE 'Asia/Tokyo')::date >= (NOW() AT TIME ZONE 'Asia/Tokyo')::date
            AND ("dueAt" AT TIME ZONE 'Asia/Tokyo')::date <= ((NOW() AT TIME ZONE 'Asia/Tokyo')::date + INTERVAL '7 days')
        )::bigint AS "dueSoon",
        COUNT(*) FILTER (
          WHERE "completed" = false
            AND ("dueAt" AT TIME ZONE 'Asia/Tokyo')::date < (NOW() AT TIME ZONE 'Asia/Tokyo')::date
        )::bigint AS "overdue"
      FROM "Todo"
      WHERE "workspaceId" = ${workspace.workspaceId}
        AND "deletedAt" IS NULL
    `;
    const row = rows[0];
    return okJson(
      {
        total: Number(row?.total ?? 0),
        pending: Number(row?.pending ?? 0),
        completed: Number(row?.completed ?? 0),
        dueSoon: Number(row?.dueSoon ?? 0),
        overdue: Number(row?.overdue ?? 0),
      },
      { requestId },
    );
  } catch (error) {
    console.error(`[${requestId}] GET /api/todos/stats failed:`, error);
    return errorJson({
      status: 500,
      code: "TODO_STATS_FETCH_FAILED",
      message: "Failed to fetch todo stats.",
      requestId,
    });
  }
}
