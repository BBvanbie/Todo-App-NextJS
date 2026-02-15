import { NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { TodoCategory, TodoPriority } from "@/src/generated/prisma";

type UpdateTodoInput = {
  title?: unknown;
  completed?: unknown;
  dueAt?: unknown;
  memo?: unknown;
  category?: unknown;
  priority?: unknown;
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

function parseMemo(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "string") return undefined;

  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  return trimmed;
}

function parseCategory(value: unknown): TodoCategory | undefined {
  if (typeof value !== "string") return undefined;
  return Object.values(TodoCategory).includes(value as TodoCategory)
    ? (value as TodoCategory)
    : undefined;
}

function parsePriority(value: unknown): TodoPriority | undefined {
  if (typeof value !== "string") return undefined;
  return Object.values(TodoPriority).includes(value as TodoPriority)
    ? (value as TodoPriority)
    : undefined;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const { id } = await params;
  const todoId = parseId(id);
  if (!todoId) {
    return NextResponse.json({ message: "Invalid id." }, { status: 400 });
  }

  try {
    const body = (await request.json()) as UpdateTodoInput;
    const shouldLogEdit =
      body.title !== undefined ||
      body.dueAt !== undefined ||
      body.memo !== undefined ||
      body.category !== undefined ||
      body.priority !== undefined;

    const data: {
      title?: string;
      memo?: string | null;
      category?: TodoCategory;
      priority?: TodoPriority;
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

    if (body.memo !== undefined) {
      const memo = parseMemo(body.memo);
      if (memo === undefined) {
        return NextResponse.json(
          { message: "memo must be a string or null." },
          { status: 400 },
        );
      }
      data.memo = memo;
    }

    if (body.category !== undefined) {
      const category = parseCategory(body.category);
      if (category === undefined) {
        return NextResponse.json(
          { message: "category is invalid." },
          { status: 400 },
        );
      }
      data.category = category;
    }

    if (body.priority !== undefined) {
      const priority = parsePriority(body.priority);
      if (priority === undefined) {
        return NextResponse.json(
          { message: "priority is invalid." },
          { status: 400 },
        );
      }
      data.priority = priority;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { message: "No updatable fields provided." },
        { status: 400 },
      );
    }

    const setClauses: string[] = [];
    const values: unknown[] = [];

    if (data.title !== undefined) {
      values.push(data.title);
      setClauses.push(`"title" = $${values.length}`);
    }
    if (data.memo !== undefined) {
      values.push(data.memo);
      setClauses.push(`"memo" = $${values.length}`);
    }
    if (data.category !== undefined) {
      values.push(data.category);
      setClauses.push(`"category" = $${values.length}::"TodoCategory"`);
    }
    if (data.priority !== undefined) {
      values.push(data.priority);
      setClauses.push(`"priority" = $${values.length}::"TodoPriority"`);
    }
    if (data.completed !== undefined) {
      values.push(data.completed);
      setClauses.push(`"completed" = $${values.length}`);
    }
    if (data.dueAt !== undefined) {
      values.push(data.dueAt);
      setClauses.push(`"dueAt" = $${values.length}`);
    }
    if (data.completedAt !== undefined) {
      values.push(data.completedAt);
      setClauses.push(`"completedAt" = $${values.length}`);
    }

    values.push(todoId);
    const idIndex = values.length;
    values.push(userId);
    const userIdIndex = values.length;

    const updatedCount = await prisma.$executeRawUnsafe(
      `
      UPDATE "Todo"
      SET ${setClauses.join(", ")},
          "updatedAt" = NOW()
      WHERE "id" = $${idIndex}
        AND "userId" = $${userIdIndex}
      `,
      ...values,
    );

    if (updatedCount === 0) {
      return NextResponse.json({ message: "Todo not found." }, { status: 404 });
    }

    if (shouldLogEdit) {
      await prisma.$executeRaw`
        INSERT INTO "TodoEditHistory" ("todoId", "userId")
        VALUES (${todoId}, ${userId})
      `;
    }

    const todo = await prisma.todo.findFirst({
      where: { id: todoId, userId },
    });
    if (!todo) {
      return NextResponse.json({ message: "Todo not found." }, { status: 404 });
    }

    return NextResponse.json(todo);
  } catch (error) {
    console.error(`PATCH /api/todos/${todoId} failed:`, error);
    const detail = error instanceof Error ? error.message : "unknown error";
    return NextResponse.json(
      { message: `Failed to update todo. (${detail})` },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const { id } = await params;
  const todoId = parseId(id);
  if (!todoId) {
    return NextResponse.json({ message: "Invalid id." }, { status: 400 });
  }

  try {
    const existing = await prisma.todo.findFirst({
      where: { id: todoId, userId },
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
    const detail = error instanceof Error ? error.message : "unknown error";
    return NextResponse.json(
      { message: `Failed to delete todo. (${detail})` },
      { status: 500 },
    );
  }
}
