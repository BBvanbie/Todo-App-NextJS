import { prisma } from "@/lib/prisma";

let todoDeletedAtColumnReady = false;

export async function ensureTodoDeletedAtColumn() {
  if (todoDeletedAtColumnReady) return;

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "Todo"
    ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMPTZ NULL
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "Todo_userId_deletedAt_completed_dueAt_idx"
    ON "Todo" ("userId", "deletedAt", "completed", "dueAt")
  `);

  todoDeletedAtColumnReady = true;
}

