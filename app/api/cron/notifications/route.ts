import { NextResponse } from "next/server";
import { NotificationType } from "@/src/generated/prisma";
import { prisma } from "@/lib/prisma";

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

async function createNotifications() {
  const now = new Date();
  const todos = await prisma.todo.findMany({
    where: { completed: false },
    select: { id: true, userId: true, title: true, dueAt: true },
  });

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
    return NextResponse.json(
      { createdCount: 0 },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  const created = await prisma.notification.createMany({
    data: records,
    skipDuplicates: true,
  });

  return NextResponse.json(
    { createdCount: created.count },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function GET(request: Request) {
  if (!isVercelCronRequest(request)) {
    return NextResponse.json(
      { message: "Method not allowed. Use POST for manual execution." },
      { status: 405, headers: { Allow: "POST", "Cache-Control": "no-store" } },
    );
  }

  if (!isAuthorized(request)) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  try {
    return await createNotifications();
  } catch (error) {
    console.error("GET /api/cron/notifications failed:", error);
    return NextResponse.json(
      { message: "Failed to generate notifications." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json(
      { message: "Unauthorized." },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    return await createNotifications();
  } catch (error) {
    console.error("POST /api/cron/notifications failed:", error);
    return NextResponse.json(
      { message: "Failed to generate notifications." },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
