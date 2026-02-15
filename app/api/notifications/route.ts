import { NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  try {
    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        todo: {
          select: {
            id: true,
            title: true,
            dueAt: true,
            completed: true,
          },
        },
      },
    });

    return NextResponse.json(notifications);
  } catch (error) {
    console.error("GET /api/notifications failed:", error);
    return NextResponse.json(
      { message: "Failed to fetch notifications." },
      { status: 500 },
    );
  }
}
