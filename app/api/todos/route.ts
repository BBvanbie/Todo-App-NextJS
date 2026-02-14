import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { TodoCategory, TodoPriority } from "@/src/generated/prisma";

type CreateTodoInput = {
  title?: unknown;
  dueAt?: unknown;
  memo?: unknown;
  category?: unknown;
  priority?: unknown;
};

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

export async function GET() {
  try {
    const todos = await prisma.todo.findMany({
      orderBy: [{ completed: "asc" }, { dueAt: "asc" }, { createdAt: "desc" }],
    });

    return NextResponse.json(todos);
  } catch (error) {
    console.error("GET /api/todos failed:", error);
    return NextResponse.json(
      { message: "Failed to fetch todos." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CreateTodoInput;

    if (typeof body.title !== "string" || body.title.trim().length === 0) {
      return NextResponse.json(
        { message: "title is required." },
        { status: 400 },
      );
    }

    const dueAt = parseDueAt(body.dueAt);
    if (dueAt === null || dueAt === undefined) {
      return NextResponse.json(
        { message: "dueAt is required and must be a valid ISO datetime string." },
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

    const category = body.category === undefined ? TodoCategory.OTHER : parseCategory(body.category);
    if (category === undefined) {
      return NextResponse.json(
        { message: "category is invalid." },
        { status: 400 },
      );
    }

    const priority = body.priority === undefined ? TodoPriority.MEDIUM : parsePriority(body.priority);
    if (priority === undefined) {
      return NextResponse.json(
        { message: "priority is invalid." },
        { status: 400 },
      );
    }

    const todo = await prisma.todo.create({
      data: {
        title: body.title.trim(),
        dueAt,
        memo: memo ?? null,
        category,
        priority,
      },
    });

    return NextResponse.json(todo, { status: 201 });
  } catch (error) {
    console.error("POST /api/todos failed:", error);
    const detail = error instanceof Error ? error.message : "unknown error";
    return NextResponse.json(
      { message: `Failed to create todo. (${detail})` },
      { status: 500 },
    );
  }
}
