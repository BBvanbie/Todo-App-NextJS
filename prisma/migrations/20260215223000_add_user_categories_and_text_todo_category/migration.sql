ALTER TABLE "Todo"
  ALTER COLUMN "category" TYPE TEXT
  USING "category"::text;

CREATE TABLE IF NOT EXISTS "UserCategory" (
  "id" SERIAL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "UserCategory_userId_name_key"
  ON "UserCategory"("userId", "name");

CREATE INDEX IF NOT EXISTS "UserCategory_userId_idx"
  ON "UserCategory"("userId");

DO $$
BEGIN
  ALTER TABLE "UserCategory"
    ADD CONSTRAINT "UserCategory_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
