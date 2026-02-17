CREATE TABLE IF NOT EXISTS "UserBuiltinCategoryLabel" (
  "id" SERIAL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "builtinKey" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "UserBuiltinCategoryLabel_userId_builtinKey_key"
  ON "UserBuiltinCategoryLabel"("userId", "builtinKey");

