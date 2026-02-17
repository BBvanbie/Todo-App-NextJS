import { getAuthenticatedUserId } from "@/lib/auth-guard";
import { errorJson, getRequestId, okJson } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";
import { ensureWorkspaceSchema, resolveWorkspaceForUser } from "@/lib/workspace";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const requestId = getRequestId(request);
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return errorJson({ status: 401, code: "UNAUTHORIZED", message: "Unauthorized.", requestId });
  }
  const { id } = await params;

  try {
    await ensureWorkspaceSchema();
    const member = await resolveWorkspaceForUser(userId, id);
    if (!member) {
      return errorJson({ status: 403, code: "WORKSPACE_FORBIDDEN", message: "Forbidden.", requestId });
    }

    const rows = await prisma.$queryRaw<
      Array<{ userId: string; role: "OWNER" | "MEMBER"; email: string; displayName: string | null }>
    >`
      SELECT wm."userId", wm."role", u."email", u."displayName"
      FROM "WorkspaceMember" wm
      INNER JOIN "User" u ON u."id" = wm."userId"
      WHERE wm."workspaceId" = ${id}
      ORDER BY wm."joinedAt" ASC
    `;
    return okJson(rows, { requestId });
  } catch (error) {
    console.error(`[${requestId}] GET /api/workspaces/${id}/members failed:`, error);
    return errorJson({
      status: 500,
      code: "WORKSPACE_MEMBERS_FETCH_FAILED",
      message: "Failed to fetch workspace members.",
      requestId,
    });
  }
}
