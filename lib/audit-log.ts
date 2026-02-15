import { prisma } from "@/lib/prisma";

export const AUDIT_ACTIONS = [
  "TODO_CREATE",
  "TODO_UPDATE",
  "TODO_COMPLETE",
  "TODO_REOPEN",
  "TODO_DELETE",
  "TODO_DUPLICATE",
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export type AuditTargetType = "TODO";

type AuditDiff = {
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  changes?: Record<string, { before: unknown; after: unknown }>;
  metadata?: Record<string, unknown>;
};

type WriteAuditLogInput = {
  actorUserId: string;
  action: AuditAction;
  targetType: AuditTargetType;
  targetId: string;
  requestId: string;
  request: Request;
  diff?: AuditDiff;
};

let auditLogTableReady = false;

export function getRequestIp(request: Request): string | null {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = request.headers.get("x-real-ip")?.trim();
  return realIp || null;
}

export function sanitizeForAudit(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map((item) => sanitizeForAudit(item));
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
      key,
      sanitizeForAudit(entry),
    ]);
    return Object.fromEntries(entries);
  }
  return value;
}

export async function ensureAuditLogTable() {
  if (auditLogTableReady) return;

  await prisma.$executeRawUnsafe(`
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
    )
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "AuditLog_actorUserId_createdAt_idx"
    ON "AuditLog" ("actorUserId", "createdAt" DESC)
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "AuditLog_targetType_targetId_createdAt_idx"
    ON "AuditLog" ("targetType", "targetId", "createdAt" DESC)
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "AuditLog_action_createdAt_idx"
    ON "AuditLog" ("action", "createdAt" DESC)
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "AuditLog_requestId_idx"
    ON "AuditLog" ("requestId")
  `);

  auditLogTableReady = true;
}

export async function writeAuditLog(input: WriteAuditLogInput) {
  await ensureAuditLogTable();

  const userAgent = input.request.headers.get("user-agent");
  const ip = getRequestIp(input.request);
  const diffJson = input.diff ? JSON.stringify(sanitizeForAudit(input.diff)) : null;

  await prisma.$executeRaw`
    INSERT INTO "AuditLog" (
      "actorUserId",
      "action",
      "targetType",
      "targetId",
      "diffJson",
      "ip",
      "userAgent",
      "requestId",
      "createdAt"
    )
    VALUES (
      ${input.actorUserId},
      ${input.action},
      ${input.targetType},
      ${input.targetId},
      ${diffJson}::jsonb,
      ${ip},
      ${userAgent},
      ${input.requestId},
      NOW()
    )
  `;
}

