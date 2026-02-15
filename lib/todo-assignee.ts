import { prisma } from "@/lib/prisma";

let todoAssigneeColumnReady = false;

export function parseAssigneeInput(value: unknown, userId: string): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "string") return undefined;

  const trimmed = value.trim();
  if (!trimmed || trimmed === "UNASSIGNED") return null;
  if (trimmed === "SELF") return userId;
  if (trimmed === userId) return userId;
  return undefined;
}

export async function ensureTodoAssigneeColumn() {
  if (todoAssigneeColumnReady) return;

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "Todo"
    ADD COLUMN IF NOT EXISTS "assigneeUserId" TEXT NULL
  `);

  await prisma.$executeRawUnsafe(`
    UPDATE "Todo"
    SET "assigneeUserId" = "userId"
    WHERE "assigneeUserId" IS NULL
      AND "userId" IS NOT NULL
  `);

  todoAssigneeColumnReady = true;
}
