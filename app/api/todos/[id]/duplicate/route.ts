import { NextResponse } from "next/server";
import { TodoCategory, TodoPriority } from "@/src/generated/prisma";
import { prisma } from "@/lib/prisma";

type DuplicateTodoInput = {
  dueDate?: unknown;
  title?: unknown;
  memo?: unknown;
  category?: unknown;
  priority?: unknown;
};

function parseId(id: string): number | null {
  const parsed = Number(id);
  if (!Number.isInteger(parsed) || parsed <= 0) return null;
  return parsed;
}

function parseDueDateToJstMidnight(value: unknown): Date | undefined {
  if (typeof value !== "string") return undefined;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;

  const date = new Date(`${value}T00:00:00+09:00`);
  if (Number.isNaN(date.getTime())) return undefined;
  return date;
}

function parseTitle(value: unknown): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (trimmed.length === 0) return undefined;
  return trimmed;
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
  if (value === undefined) return undefined;
  if (typeof value !== "string") return undefined;
  return Object.values(TodoCategory).includes(value as TodoCategory)
    ? (value as TodoCategory)
    : undefined;
}

function parsePriority(value: unknown): TodoPriority | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string") return undefined;
  return Object.values(TodoPriority).includes(value as TodoPriority)
    ? (value as TodoPriority)
    : undefined;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const todoId = parseId(id);
  if (!todoId) {
    return NextResponse.json({ message: "Invalid id." }, { status: 400 });
  }

  try {
    const body = (await request.json()) as DuplicateTodoInput;
    const dueAt = parseDueDateToJstMidnight(body.dueDate);
    if (!dueAt) {
      return NextResponse.json(
        { message: "dueDate is required in YYYY-MM-DD format." },
        { status: 400 },
      );
    }

    const existing = await prisma.todo.findUnique({
      where: { id: todoId },
    });
    if (!existing) {
      return NextResponse.json({ message: "Todo not found." }, { status: 404 });
    }

    const title = parseTitle(body.title);
    if (body.title !== undefined && !title) {
      return NextResponse.json(
        { message: "title must be a non-empty string." },
        { status: 400 },
      );
    }

    const memo = parseMemo(body.memo);
    if (body.memo !== undefined && memo === undefined) {
      return NextResponse.json(
        { message: "memo must be a string or null." },
        { status: 400 },
      );
    }

    const category = parseCategory(body.category);
    if (body.category !== undefined && !category) {
      return NextResponse.json(
        { message: "category is invalid." },
        { status: 400 },
      );
    }

    const priority = parsePriority(body.priority);
    if (body.priority !== undefined && !priority) {
      return NextResponse.json(
        { message: "priority is invalid." },
        { status: 400 },
      );
    }

    const duplicated = await prisma.todo.create({
      data: {
        title: title ?? existing.title,
        memo: memo === undefined ? existing.memo : memo,
        category: category ?? existing.category,
        priority: priority ?? existing.priority,
        dueAt,
        completed: false,
        completedAt: null,
      },
    });

    return NextResponse.json(duplicated, { status: 201 });
  } catch (error) {
    console.error(`POST /api/todos/${todoId}/duplicate failed:`, error);
    return NextResponse.json(
      { message: "Failed to duplicate todo." },
      { status: 500 },
    );
  }
}
