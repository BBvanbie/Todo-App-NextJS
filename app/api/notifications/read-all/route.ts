import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH() {
  try {
    const result = await prisma.notification.updateMany({
      where: { readAt: null },
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
