import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type UpdateTodoInput = {
  title?: unknown;
  completed?: unknown;
  dueAt?: unknown;
};

function parseId(id: string): number | null {
  const parsed = Number(id);
  if (!Number.isInteger(parsed) || parsed <= 0) return null;
  return parsed;
}

function parseDueAt(value: unknown): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  if (typeof value !== "string") return undefined;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const todoId = parseId(id);
  if (!todoId) {
    return NextResponse.json({ message: "Invalid id." }, { status: 400 });
  }

  try {
    const body = (await request.json()) as UpdateTodoInput;
    const data: {
      title?: string;
      completed?: boolean;
      dueAt?: Date;
      completedAt?: Date | null;
    } = {};

    if (body.title !== undefined) {
      if (typeof body.title !== "string" || body.title.trim().length === 0) {
        return NextResponse.json(
          { message: "title must be a non-empty string." },
          { status: 400 },
        );
      }
      data.title = body.title.trim();
    }

    if (body.completed !== undefined) {
      if (typeof body.completed !== "boolean") {
        return NextResponse.json(
          { message: "completed must be a boolean." },
          { status: 400 },
        );
      }
      data.completed = body.completed;
      data.completedAt = body.completed ? new Date() : null;
    }

    if (body.dueAt !== undefined) {
      const dueAt = parseDueAt(body.dueAt);
      if (dueAt === null || dueAt === undefined) {
        return NextResponse.json(
          { message: "dueAt must be a valid ISO datetime string." },
          { status: 400 },
        );
      }
      data.dueAt = dueAt;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { message: "No updatable fields provided." },
        { status: 400 },
      );
    }

    const existing = await prisma.todo.findUnique({
      where: { id: todoId },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ message: "Todo not found." }, { status: 404 });
    }

    const todo = await prisma.todo.update({
      where: { id: todoId },
      data,
    });

    return NextResponse.json(todo);
  } catch (error) {
    console.error(`PATCH /api/todos/${todoId} failed:`, error);
    return NextResponse.json(
      { message: "Failed to update todo." },
      { status: 500 },
    );
  }
}

export async function DELETE(
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

    await prisma.todo.delete({
      where: { id: todoId },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error(`DELETE /api/todos/${todoId} failed:`, error);
    return NextResponse.json(
      { message: "Failed to delete todo." },
      { status: 500 },
    );
  }
}
