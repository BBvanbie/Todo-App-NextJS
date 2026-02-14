import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const notifications = await prisma.notification.findMany({
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
