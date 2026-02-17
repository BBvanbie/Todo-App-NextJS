import crypto from "crypto";
import { prisma } from "@/lib/prisma";

export type WorkspaceRole = "OWNER" | "MEMBER";

export type WorkspaceSummary = {
  id: string;
  name: string;
  isPersonal: boolean;
  role: WorkspaceRole;
};

let workspaceSchemaReady = false;
let todoWorkspaceColumnReady = false;

export async function ensureWorkspaceSchema() {
  if (workspaceSchemaReady) return;

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Workspace" (
      "id" TEXT PRIMARY KEY,
      "name" TEXT NOT NULL,
      "ownerUserId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
      "isPersonal" BOOLEAN NOT NULL DEFAULT false,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "Workspace_ownerUserId_isPersonal_key"
    ON "Workspace" ("ownerUserId", "isPersonal")
    WHERE "isPersonal" = true
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "WorkspaceMember" (
      "workspaceId" TEXT NOT NULL REFERENCES "Workspace"("id") ON DELETE CASCADE,
      "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
      "role" TEXT NOT NULL CHECK ("role" IN ('OWNER', 'MEMBER')),
      "joinedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY ("workspaceId", "userId")
    )
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "WorkspaceMember_userId_idx"
    ON "WorkspaceMember" ("userId")
  `);

  await prisma.$executeRawUnsafe(`
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
    )
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "WorkspaceInvite_workspaceId_email_idx"
    ON "WorkspaceInvite" ("workspaceId", "email")
  `);

  workspaceSchemaReady = true;
}

export async function ensureTodoWorkspaceColumn() {
  if (todoWorkspaceColumnReady) return;
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "Todo"
    ADD COLUMN IF NOT EXISTS "workspaceId" TEXT NULL
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "Todo_workspaceId_deletedAt_completed_dueAt_idx"
    ON "Todo" ("workspaceId", "deletedAt", "completed", "dueAt")
  `);
  todoWorkspaceColumnReady = true;
}

function normalizePersonalWorkspaceName(displayNameOrEmail?: string) {
  const base = displayNameOrEmail?.trim() || "Personal";
  return `${base} (Personal)`;
}

export async function ensurePersonalWorkspace(userId: string, displayNameOrEmail?: string) {
  await ensureWorkspaceSchema();
  const existing = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT "id"
    FROM "Workspace"
    WHERE "ownerUserId" = ${userId}
      AND "isPersonal" = true
    LIMIT 1
  `;
  if (existing[0]) return existing[0].id;

  const workspaceId = crypto.randomUUID();
  const name = normalizePersonalWorkspaceName(displayNameOrEmail);
  await prisma.$executeRaw`
    INSERT INTO "Workspace" ("id", "name", "ownerUserId", "isPersonal", "createdAt", "updatedAt")
    VALUES (${workspaceId}, ${name}, ${userId}, true, NOW(), NOW())
  `;
  await prisma.$executeRaw`
    INSERT INTO "WorkspaceMember" ("workspaceId", "userId", "role", "joinedAt")
    VALUES (${workspaceId}, ${userId}, 'OWNER', NOW())
    ON CONFLICT ("workspaceId", "userId") DO NOTHING
  `;
  return workspaceId;
}

export async function ensureUserTodoWorkspaceBackfill(userId: string, displayNameOrEmail?: string) {
  await ensureTodoWorkspaceColumn();
  const personalWorkspaceId = await ensurePersonalWorkspace(userId, displayNameOrEmail);
  await prisma.$executeRaw`
    UPDATE "Todo"
    SET "workspaceId" = ${personalWorkspaceId}
    WHERE "userId" = ${userId}
      AND "workspaceId" IS NULL
  `;
  return personalWorkspaceId;
}

export async function listUserWorkspaces(userId: string): Promise<WorkspaceSummary[]> {
  await ensureWorkspaceSchema();
  const rows = await prisma.$queryRaw<
    Array<{ id: string; name: string; isPersonal: boolean; role: WorkspaceRole }>
  >`
    SELECT w."id", w."name", w."isPersonal", wm."role"
    FROM "WorkspaceMember" wm
    INNER JOIN "Workspace" w ON w."id" = wm."workspaceId"
    WHERE wm."userId" = ${userId}
    ORDER BY w."isPersonal" DESC, w."createdAt" ASC
  `;
  return rows;
}

export async function resolveWorkspaceForUser(
  userId: string,
  workspaceId?: string | null,
  displayNameOrEmail?: string,
) {
  const personalWorkspaceId = await ensureUserTodoWorkspaceBackfill(userId, displayNameOrEmail);
  if (!workspaceId) {
    return { workspaceId: personalWorkspaceId, role: "OWNER" as WorkspaceRole };
  }

  const member = await prisma.$queryRaw<Array<{ role: WorkspaceRole }>>`
    SELECT "role"
    FROM "WorkspaceMember"
    WHERE "workspaceId" = ${workspaceId}
      AND "userId" = ${userId}
    LIMIT 1
  `;
  if (!member[0]) {
    return null;
  }
  return { workspaceId, role: member[0].role };
}

export function createInviteToken() {
  return crypto.randomBytes(32).toString("hex");
}

export function hashInviteToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}
