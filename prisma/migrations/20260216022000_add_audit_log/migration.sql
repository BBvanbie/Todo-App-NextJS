CREATE TABLE IF NOT EXISTS "AuditLog" (
  "id" BIGSERIAL PRIMARY KEY,
  "actorUserId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "targetType" TEXT NOT NULL,
  "targetId" TEXT NOT NULL,
  "diffJson" JSONB,
  "ip" TEXT,
  "userAgent" TEXT,
  "requestId" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "AuditLog_actorUserId_createdAt_idx"
ON "AuditLog" ("actorUserId", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "AuditLog_targetType_targetId_createdAt_idx"
ON "AuditLog" ("targetType", "targetId", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "AuditLog_action_createdAt_idx"
ON "AuditLog" ("action", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "AuditLog_requestId_idx"
ON "AuditLog" ("requestId");
