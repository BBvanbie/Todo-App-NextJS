ALTER TABLE "Todo"
ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMPTZ NULL;

CREATE INDEX IF NOT EXISTS "Todo_userId_deletedAt_completed_dueAt_idx"
ON "Todo" ("userId", "deletedAt", "completed", "dueAt");
