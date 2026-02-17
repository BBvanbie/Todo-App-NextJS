import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { errorJson, getRequestId, okJson } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";
import { ensureWorkspaceSchema, hashInviteToken } from "@/lib/workspace";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const requestId = getRequestId(request);
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  const email = session?.user?.email?.trim().toLowerCase() ?? "";
  if (!userId || !email) {
    return errorJson({ status: 401, code: "UNAUTHORIZED", message: "Unauthorized.", requestId });
  }

  const { token } = await params;
  if (!token || token.length < 10) {
    return errorJson({
      status: 400,
      code: "INVITE_TOKEN_INVALID",
      message: "Invalid invite token.",
      requestId,
    });
  }

  try {
    await ensureWorkspaceSchema();
    const tokenHash = hashInviteToken(token);
    const rows = await prisma.$queryRaw<
      Array<{ id: string; workspaceId: string; email: string; expiresAt: Date; acceptedAt: Date | null; revokedAt: Date | null }>
    >`
      SELECT "id", "workspaceId", "email", "expiresAt", "acceptedAt", "revokedAt"
      FROM "WorkspaceInvite"
      WHERE "tokenHash" = ${tokenHash}
      LIMIT 1
    `;
    const invite = rows[0];
    if (!invite) {
      return errorJson({
        status: 404,
        code: "INVITE_TOKEN_INVALID",
        message: "Invite not found.",
        requestId,
      });
    }
    if (invite.revokedAt || invite.acceptedAt) {
      return errorJson({
        status: 400,
        code: "INVITE_TOKEN_INVALID",
        message: "Invite is no longer valid.",
        requestId,
      });
    }
    if (invite.expiresAt.getTime() < Date.now()) {
      return errorJson({
        status: 400,
        code: "INVITE_TOKEN_EXPIRED",
        message: "Invite has expired.",
        requestId,
      });
    }
    if (invite.email.trim().toLowerCase() !== email) {
      return errorJson({
        status: 403,
        code: "INVITE_EMAIL_MISMATCH",
        message: "Signed-in email does not match invite email.",
        requestId,
      });
    }

    await prisma.$executeRaw`
      INSERT INTO "WorkspaceMember" ("workspaceId", "userId", "role", "joinedAt")
      VALUES (${invite.workspaceId}, ${userId}, 'MEMBER', NOW())
      ON CONFLICT ("workspaceId", "userId") DO NOTHING
    `;
    await prisma.$executeRaw`
      UPDATE "WorkspaceInvite"
      SET "acceptedAt" = NOW()
      WHERE "id" = ${invite.id}
    `;

    return okJson({ workspaceId: invite.workspaceId, accepted: true }, { requestId });
  } catch (error) {
    console.error(`[${requestId}] POST /api/workspaces/invites/${token}/accept failed:`, error);
    return errorJson({
      status: 500,
      code: "INVITE_ACCEPT_FAILED",
      message: "Failed to accept invite.",
      requestId,
    });
  }
}
