CREATE TABLE IF NOT EXISTS "Workspace" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "ownerUserId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "isPersonal" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS "Workspace_ownerUserId_isPersonal_key"
ON "Workspace" ("ownerUserId", "isPersonal")
WHERE "isPersonal" = true;

CREATE TABLE IF NOT EXISTS "WorkspaceMember" (
  "workspaceId" TEXT NOT NULL REFERENCES "Workspace"("id") ON DELETE CASCADE,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "role" TEXT NOT NULL CHECK ("role" IN ('OWNER', 'MEMBER')),
  "joinedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY ("workspaceId", "userId")
);

CREATE INDEX IF NOT EXISTS "WorkspaceMember_userId_idx"
ON "WorkspaceMember" ("userId");

CREATE TABLE IF NOT EXISTS "WorkspaceInvite" (
  "id" TEXT PRIMARY KEY,
  "workspaceId" TEXT NOT NULL REFERENCES "Workspace"("id") ON DELETE CASCADE,
  "email" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL UNIQUE,
  "invitedByUserId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "expiresAt" TIMESTAMPTZ NOT NULL,
  "acceptedAt" TIMESTAMPTZ NULL,
  "revokedAt" TIMESTAMPTZ NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "WorkspaceInvite_workspaceId_email_idx"
ON "WorkspaceInvite" ("workspaceId", "email");

ALTER TABLE "Todo"
ADD COLUMN IF NOT EXISTS "workspaceId" TEXT NULL;

CREATE INDEX IF NOT EXISTS "Todo_workspaceId_deletedAt_completed_dueAt_idx"
ON "Todo" ("workspaceId", "deletedAt", "completed", "dueAt");
