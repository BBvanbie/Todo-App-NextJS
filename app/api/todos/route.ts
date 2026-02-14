import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type CreateTodoInput = {
  title?: unknown;
  dueAt?: unknown;
};

function parseDueAt(value: unknown): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  if (typeof value !== "string") return undefined;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date;
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

    const todo = await prisma.todo.create({
      data: {
        title: body.title.trim(),
        dueAt,
      },
    });

    return NextResponse.json(todo, { status: 201 });
  } catch (error) {
    console.error("POST /api/todos failed:", error);
    return NextResponse.json(
      { message: "Failed to create todo." },
      { status: 500 },
    );
  }
}
