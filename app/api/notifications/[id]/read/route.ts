import { NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";

function parseId(id: string): number | null {
  const parsed = Number(id);
  if (!Number.isInteger(parsed) || parsed <= 0) return null;
  return parsed;
}

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const { id } = await params;
  const notificationId = parseId(id);
  if (!notificationId) {
    return NextResponse.json({ message: "Invalid id." }, { status: 400 });
  }

  try {
    const exists = await prisma.notification.findFirst({
      where: { id: notificationId, userId },
      select: { id: true },
    });
    if (!exists) {
      return NextResponse.json(
        { message: "Notification not found." },
        { status: 404 },
      );
    }

    const updated = await prisma.notification.update({
      where: { id: notificationId },
      data: { readAt: new Date() },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error(`PATCH /api/notifications/${notificationId}/read failed:`, error);
    return NextResponse.json(
      { message: "Failed to mark notification as read." },
      { status: 500 },
    );
  }
}
