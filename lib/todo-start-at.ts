import { prisma } from "@/lib/prisma";

let todoStartAtColumnReady = false;

export async function ensureTodoStartAtColumn() {
  if (todoStartAtColumnReady) return;

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "Todo"
    ADD COLUMN IF NOT EXISTS "startAt" TIMESTAMPTZ NULL
  `);

  todoStartAtColumnReady = true;
}
