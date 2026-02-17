import { getAuthenticatedUserId } from "@/lib/auth-guard";
import { errorJson, getRequestId, okJson } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";
import { ensureWorkspaceSchema, resolveWorkspaceForUser } from "@/lib/workspace";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; inviteId: string }> },
) {
  const requestId = getRequestId(request);
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return errorJson({ status: 401, code: "UNAUTHORIZED", message: "Unauthorized.", requestId });
  }

  const { id, inviteId } = await params;
  try {
    await ensureWorkspaceSchema();
    const member = await resolveWorkspaceForUser(userId, id);
    if (!member) {
      return errorJson({ status: 403, code: "WORKSPACE_FORBIDDEN", message: "Forbidden.", requestId });
    }
    if (member.role !== "OWNER") {
      return errorJson({ status: 403, code: "OWNER_REQUIRED", message: "Owner role required.", requestId });
    }

    await prisma.$executeRaw`
      UPDATE "WorkspaceInvite"
      SET "revokedAt" = NOW()
      WHERE "id" = ${inviteId}
        AND "workspaceId" = ${id}
        AND "acceptedAt" IS NULL
        AND "revokedAt" IS NULL
    `;
    return okJson({ inviteId, revoked: true }, { requestId });
  } catch (error) {
    console.error(`[${requestId}] POST /api/workspaces/${id}/invites/${inviteId}/revoke failed:`, error);
    return errorJson({
      status: 500,
      code: "WORKSPACE_INVITE_REVOKE_FAILED",
      message: "Failed to revoke workspace invite.",
      requestId,
    });
  }
}
