import { prisma } from "@/lib/prisma";

export const TODO_STATUSES = ["OPEN", "IN_PROGRESS", "BLOCKED", "DONE"] as const;

export type TodoStatus = (typeof TODO_STATUSES)[number];

let todoStatusColumnReady = false;

export function normalizeTodoStatusInput(value: unknown): TodoStatus | null {
  if (typeof value !== "string") return null;
  return TODO_STATUSES.includes(value as TodoStatus) ? (value as TodoStatus) : null;
}

export function completedFromStatus(status: TodoStatus) {
  return status === "DONE";
}

export function statusFromCompleted(completed: boolean): TodoStatus {
  return completed ? "DONE" : "OPEN";
}

export async function ensureTodoStatusColumn() {
  if (todoStatusColumnReady) return;

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "Todo"
    ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'OPEN'
  `);

  await prisma.$executeRawUnsafe(`
    UPDATE "Todo"
    SET "status" = CASE
      WHEN "completed" = true THEN 'DONE'
      ELSE 'OPEN'
    END
    WHERE "status" IS NULL OR "status" = ''
  `);

  todoStatusColumnReady = true;
}
