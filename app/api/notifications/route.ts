import { getAuthenticatedUserId } from "@/lib/auth-guard";
import { errorJson, getRequestId, okJson } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";
import { ensureTodoDeletedAtColumn } from "@/lib/todo-soft-delete";

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
    const notifications = await prisma.$queryRaw<
      Array<{
        id: number;
        todoId: number;
        userId: string | null;
        type: string;
        message: string;
        createdAt: Date;
        readAt: Date | null;
        todo: { id: number; title: string; dueAt: Date; completed: boolean };
      }>
    >`
      SELECT
        n."id",
        n."todoId",
        n."userId",
        n."type",
        n."message",
        n."createdAt",
        n."readAt",
        json_build_object(
          'id', t."id",
          'title', t."title",
          'dueAt', t."dueAt",
          'completed', t."completed"
        ) AS "todo"
      FROM "Notification" n
      JOIN "Todo" t ON t."id" = n."todoId"
      WHERE n."userId" = ${userId}
        AND t."deletedAt" IS NULL
      ORDER BY n."createdAt" DESC
      LIMIT 50
    `;

    return okJson(notifications, { requestId });
  } catch (error) {
    console.error(`[${requestId}] GET /api/notifications failed:`, error);
    return errorJson({
      status: 500,
      code: "NOTIFICATIONS_FETCH_FAILED",
      message: "Failed to fetch notifications.",
      requestId,
    });
  }
}
