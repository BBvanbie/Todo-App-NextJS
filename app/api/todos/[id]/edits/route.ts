import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function parseId(id: string): number | null {
  const parsed = Number(id);
  if (!Number.isInteger(parsed) || parsed <= 0) return null;
  return parsed;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const todoId = parseId(id);
  if (!todoId) {
    return NextResponse.json({ message: "Invalid id." }, { status: 400 });
  }

  try {
    const existing = await prisma.todo.findUnique({
      where: { id: todoId },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ message: "Todo not found." }, { status: 404 });
    }

    const histories = await prisma.$queryRaw<
      Array<{ id: number; editedAt: Date }>
    >`
      SELECT "id", "editedAt"
      FROM "TodoEditHistory"
      WHERE "todoId" = ${todoId}
      ORDER BY "editedAt" DESC
      LIMIT 100
    `;

    return NextResponse.json(histories);
  } catch (error) {
    console.error(`GET /api/todos/${todoId}/edits failed:`, error);
    return NextResponse.json(
      { message: "Failed to fetch edit histories." },
      { status: 500 },
    );
  }
}
