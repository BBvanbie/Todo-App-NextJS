import crypto from "crypto";
import { getAuthenticatedUserId } from "@/lib/auth-guard";
import { errorJson, getRequestId, okJson } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";
import { sendWorkspaceInviteMail } from "@/lib/workspace-invite-mail";
import { createInviteToken, ensureWorkspaceSchema, hashInviteToken, resolveWorkspaceForUser } from "@/lib/workspace";

function inviteExpiry() {
  const raw = Number(process.env.WORKSPACE_INVITE_EXPIRES_HOURS ?? "24");
  const hours = Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 24;
  return new Date(Date.now() + hours * 60 * 60 * 1000);
}

function appBaseUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/+$/, "");
}

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

    const inviteRows = await prisma.$queryRaw<
      Array<{ id: string; email: string; acceptedAt: Date | null; revokedAt: Date | null }>
    >`
      SELECT "id", "email", "acceptedAt", "revokedAt"
      FROM "WorkspaceInvite"
      WHERE "id" = ${inviteId}
        AND "workspaceId" = ${id}
      LIMIT 1
    `;
    const targetInvite = inviteRows[0];
    if (!targetInvite) {
      return errorJson({
        status: 404,
        code: "WORKSPACE_INVITE_NOT_FOUND",
        message: "Workspace invite not found.",
        requestId,
      });
    }
    if (targetInvite.acceptedAt) {
      return errorJson({
        status: 409,
        code: "WORKSPACE_INVITE_ALREADY_ACCEPTED",
        message: "Accepted invite cannot be resent.",
        requestId,
      });
    }
    if (targetInvite.revokedAt) {
      return errorJson({
        status: 409,
        code: "WORKSPACE_INVITE_ALREADY_REVOKED",
        message: "Revoked invite cannot be resent.",
        requestId,
      });
    }

    const [workspace] = await prisma.$queryRaw<Array<{ name: string }>>`
      SELECT "name" FROM "Workspace" WHERE "id" = ${id} LIMIT 1
    `;
    if (!workspace) {
      return errorJson({
        status: 404,
        code: "WORKSPACE_NOT_FOUND",
        message: "Workspace not found.",
        requestId,
      });
    }

    const inviterRows = await prisma.$queryRaw<Array<{ email: string; displayName: string | null }>>`
      SELECT "email", "displayName" FROM "User" WHERE "id" = ${userId} LIMIT 1
    `;
    const inviter = inviterRows[0];
    const inviterName = inviter?.displayName?.trim() || inviter?.email || "User";

    await prisma.$executeRaw`
      UPDATE "WorkspaceInvite"
      SET "revokedAt" = NOW()
      WHERE "id" = ${inviteId}
        AND "workspaceId" = ${id}
        AND "acceptedAt" IS NULL
        AND "revokedAt" IS NULL
    `;

    const token = createInviteToken();
    const tokenHash = hashInviteToken(token);
    const newInviteId = crypto.randomUUID();
    const expiresAt = inviteExpiry();
    await prisma.$executeRaw`
      INSERT INTO "WorkspaceInvite" (
        "id", "workspaceId", "email", "tokenHash", "invitedByUserId", "expiresAt", "createdAt"
      )
      VALUES (
        ${newInviteId}, ${id}, ${targetInvite.email}, ${tokenHash}, ${userId}, ${expiresAt}, NOW()
      )
    `;

    const inviteUrl = `${appBaseUrl()}/invite/${token}`;
    let mailStatus: "sent" | "failed" | "skipped" = "skipped";
    let mailError: string | null = null;
    try {
      const mailResult = await sendWorkspaceInviteMail({
        toEmail: targetInvite.email,
        inviterName,
        workspaceName: workspace.name,
        inviteUrl,
      });
      mailStatus = mailResult.status === "sent" ? "sent" : "skipped";
      if (mailResult.status === "skipped") {
        mailError = mailResult.reason;
      }
    } catch (e) {
      mailStatus = "failed";
      mailError = e instanceof Error ? e.message : "send failed";
    }

    return okJson(
      {
        inviteId: newInviteId,
        replacedInviteId: inviteId,
        email: targetInvite.email,
        inviteUrl,
        expiresAt,
        mailStatus,
        mailError,
      },
      { requestId },
    );
  } catch (error) {
    console.error(`[${requestId}] POST /api/workspaces/${id}/invites/${inviteId}/resend failed:`, error);
    return errorJson({
      status: 500,
      code: "WORKSPACE_INVITE_RESEND_FAILED",
      message: "Failed to resend workspace invite.",
      requestId,
    });
  }
}
