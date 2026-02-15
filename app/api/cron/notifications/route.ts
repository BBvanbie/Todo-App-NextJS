import { errorJson, getRequestId, okJson } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";
import { ensureTodoDeletedAtColumn } from "@/lib/todo-soft-delete";
import { NotificationType } from "@/src/generated/prisma";

function getTokyoYmd(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((p) => p.type === "year")?.value ?? "1970";
  const month = parts.find((p) => p.type === "month")?.value ?? "01";
  const day = parts.find((p) => p.type === "day")?.value ?? "01";
  return `${year}-${month}-${day}`;
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function notificationMessage(type: NotificationType, title: string) {
  if (type === NotificationType.DUE_IN_7_DAYS) {
    return `「${title}」の期限まで7日です。`;
  }
  if (type === NotificationType.DUE_IN_3_DAYS) {
    return `「${title}」の期限まで3日です。`;
  }
  if (type === NotificationType.DUE_TODAY) {
    return `「${title}」の期限は今日です。`;
  }
  return `「${title}」は期限切れから3日経過しています。`;
}

function resolveTypeByDueDate(dueAt: Date, now: Date): NotificationType | null {
  const dueKey = getTokyoYmd(dueAt);
  const in7Key = getTokyoYmd(addDays(now, 7));
  const in3Key = getTokyoYmd(addDays(now, 3));
  const todayKey = getTokyoYmd(now);
  const overdue3Key = getTokyoYmd(addDays(now, -3));

  if (dueKey === in7Key) return NotificationType.DUE_IN_7_DAYS;
  if (dueKey === in3Key) return NotificationType.DUE_IN_3_DAYS;
  if (dueKey === todayKey) return NotificationType.DUE_TODAY;
  if (dueKey === overdue3Key) return NotificationType.OVERDUE_3_DAYS;
  return null;
}

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const authHeader = request.headers.get("authorization");
  const xCronSecret = request.headers.get("x-cron-secret");

  if (authHeader === `Bearer ${secret}`) return true;
  if (xCronSecret === secret) return true;
  return false;
}

function isVercelCronRequest(request: Request): boolean {
  const ua = request.headers.get("user-agent")?.toLowerCase() ?? "";
  const xVercelCron = request.headers.get("x-vercel-cron");
  return ua.includes("vercel-cron") || xVercelCron !== null;
}

async function createNotifications(requestId: string) {
  await ensureTodoDeletedAtColumn();
  const now = new Date();
  const todos = await prisma.$queryRaw<
    Array<{ id: number; userId: string | null; title: string; dueAt: Date }>
  >`
    SELECT "id", "userId", "title", "dueAt"
    FROM "Todo"
    WHERE "completed" = false
      AND "deletedAt" IS NULL
  `;

  const records = todos
    .map((todo) => {
      const type = resolveTypeByDueDate(todo.dueAt, now);
      if (!type) return null;
      return {
        todoId: todo.id,
        userId: todo.userId,
        type,
        message: notificationMessage(type, todo.title),
      };
    })
    .filter(
      (v): v is { todoId: number; userId: string | null; type: NotificationType; message: string } =>
        Boolean(v),
    );

  if (records.length === 0) {
    return okJson(
      { createdCount: 0 },
      { requestId, headers: { "Cache-Control": "no-store" } },
    );
  }

  const created = await prisma.notification.createMany({
    data: records,
    skipDuplicates: true,
  });

  return okJson(
    { createdCount: created.count },
    { requestId, headers: { "Cache-Control": "no-store" } },
  );
}

export async function GET(request: Request) {
  const requestId = getRequestId(request);

  if (!isVercelCronRequest(request)) {
    return errorJson({
      status: 405,
      code: "METHOD_NOT_ALLOWED",
      message: "Method not allowed. Use POST for manual execution.",
      requestId,
      headers: { Allow: "POST", "Cache-Control": "no-store" },
    });
  }

  if (!isAuthorized(request)) {
    return errorJson({
      status: 401,
      code: "UNAUTHORIZED",
      message: "Unauthorized.",
      requestId,
      headers: { "Cache-Control": "no-store" },
    });
  }

  try {
    return await createNotifications(requestId);
  } catch (error) {
    console.error(`[${requestId}] GET /api/cron/notifications failed:`, error);
    return errorJson({
      status: 500,
      code: "CRON_NOTIFICATIONS_FAILED",
      message: "Failed to generate notifications.",
      requestId,
      headers: { "Cache-Control": "no-store" },
    });
  }
}

export async function POST(request: Request) {
  const requestId = getRequestId(request);

  if (!isAuthorized(request)) {
    return errorJson({
      status: 401,
      code: "UNAUTHORIZED",
      message: "Unauthorized.",
      requestId,
      headers: { "Cache-Control": "no-store" },
    });
  }

  try {
    return await createNotifications(requestId);
  } catch (error) {
    console.error(`[${requestId}] POST /api/cron/notifications failed:`, error);
    return errorJson({
      status: 500,
      code: "CRON_NOTIFICATIONS_FAILED",
      message: "Failed to generate notifications.",
      requestId,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
