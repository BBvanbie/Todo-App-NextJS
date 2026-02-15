import { getAuthenticatedUserId } from "@/lib/auth-guard";
import { ensureAuditLogTable } from "@/lib/audit-log";
import { errorJson, getRequestId, okJson } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";

function parseLimit(raw: string | null) {
  if (!raw) return 100;
  const num = Number(raw);
  if (!Number.isInteger(num) || num <= 0) return null;
  return Math.min(num, 300);
}

export async function GET(request: Request) {
  const requestId = getRequestId(request);
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return errorJson({
      status: 401,
      code: "UNAUTHORIZED",
      message: "Unauthorized.",
      requestId,
    });
  }

  try {
    await ensureAuditLogTable();

    const url = new URL(request.url);
    const action = url.searchParams.get("action");
    const limit = parseLimit(url.searchParams.get("limit"));
    if (limit === null) {
      return errorJson({
        status: 400,
        code: "INVALID_LIMIT",
        message: "limit must be a positive integer.",
        requestId,
      });
    }

    const whereClauses: string[] = ['"actorUserId" = $1'];
    const values: unknown[] = [userId];
    if (action && action !== "ALL") {
      values.push(action);
      whereClauses.push(`"action" = $${values.length}`);
    }
    values.push(limit);
    const limitParam = `$${values.length}`;

    const logs = await prisma.$queryRawUnsafe<
      Array<{
        id: bigint;
        actorUserId: string;
        action: string;
        targetType: string;
        targetId: string;
        diffJson: unknown;
        ip: string | null;
        userAgent: string | null;
        requestId: string | null;
        createdAt: Date;
      }>
    >(
      `
      SELECT *
      FROM "AuditLog"
      WHERE ${whereClauses.join(" AND ")}
      ORDER BY "createdAt" DESC
      LIMIT ${limitParam}
      `,
      ...values,
    );

    return okJson(
      logs.map((log) => ({
        ...log,
        id: Number(log.id),
      })),
      { requestId },
    );
  } catch (error) {
    console.error(`[${requestId}] GET /api/audit failed:`, error);
    return errorJson({
      status: 500,
      code: "AUDIT_FETCH_FAILED",
      message: "Failed to fetch audit logs.",
      requestId,
    });
  }
}

