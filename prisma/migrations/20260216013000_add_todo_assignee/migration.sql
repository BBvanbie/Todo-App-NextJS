ALTER TABLE "Todo"
ADD COLUMN IF NOT EXISTS "assigneeUserId" TEXT NULL;

UPDATE "Todo"
SET "assigneeUserId" = "userId"
WHERE "assigneeUserId" IS NULL
  AND "userId" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "Todo_userId_assigneeUserId_completed_dueAt_idx"
ON "Todo" ("userId", "assigneeUserId", "completed", "dueAt");
