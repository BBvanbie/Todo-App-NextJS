import { NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";

export async function PATCH() {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  try {
    const result = await prisma.notification.updateMany({
      where: { readAt: null, userId },
      data: { readAt: new Date() },
    });

    return NextResponse.json({ updatedCount: result.count });
  } catch (error) {
    console.error("PATCH /api/notifications/read-all failed:", error);
    return NextResponse.json(
      { message: "Failed to mark all notifications as read." },
      { status: 500 },
    );
  }
}
