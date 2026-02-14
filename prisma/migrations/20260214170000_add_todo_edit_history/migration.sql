CREATE TABLE "TodoEditHistory" (
  "id" SERIAL NOT NULL,
  "todoId" INTEGER NOT NULL,
  "editedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "TodoEditHistory_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TodoEditHistory_todoId_editedAt_idx" ON "TodoEditHistory"("todoId", "editedAt");

ALTER TABLE "TodoEditHistory"
ADD CONSTRAINT "TodoEditHistory_todoId_fkey"
FOREIGN KEY ("todoId")
REFERENCES "Todo"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;
