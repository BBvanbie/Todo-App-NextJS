ALTER TABLE "Todo"
  ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'OPEN';

UPDATE "Todo"
SET "status" = CASE
  WHEN "completed" = true THEN 'DONE'
  ELSE 'OPEN'
END
WHERE "status" IS NULL OR "status" = '';

