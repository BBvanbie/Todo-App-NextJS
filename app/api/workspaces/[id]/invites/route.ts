import crypto from "crypto";
import { getAuthenticatedUserId } from "@/lib/auth-guard";
import { errorJson, getRequestId, okJson } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";
import { sendWorkspaceInviteMail } from "@/lib/workspace-invite-mail";
import { ensureWorkspaceSchema, hashInviteToken, resolveWorkspaceForUser } from "@/lib/workspace";

type CreateWorkspaceInviteInput = {
  email?: unknown;
};

function normalizeEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  if (!email || !email.includes("@")) return null;
  return email;
}

function inviteExpiry() {
  const raw = Number(process.env.WORKSPACE_INVITE_EXPIRES_HOURS ?? "24");
  const hours = Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 24;
  return new Date(Date.now() + hours * 60 * 60 * 1000);
}

function appBaseUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/+$/, "");
}

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
      Array<{
        id: string;
        email: string;
        invitedByUserId: string;
        inviterDisplayName: string | null;
        inviterEmail: string | null;
        expiresAt: Date;
        acceptedAt: Date | null;
        revokedAt: Date | null;
        createdAt: Date;
      }>
    >`
      SELECT
        wi."id",
        wi."email",
        wi."invitedByUserId",
        u."displayName" AS "inviterDisplayName",
        u."email" AS "inviterEmail",
        wi."expiresAt",
        wi."acceptedAt",
        wi."revokedAt",
        wi."createdAt"
      FROM "WorkspaceInvite" wi
      LEFT JOIN "User" u ON u."id" = wi."invitedByUserId"
      WHERE wi."workspaceId" = ${id}
      ORDER BY wi."createdAt" DESC
      LIMIT 100
    `;

    return okJson(rows, { requestId });
  } catch (error) {
    console.error(`[${requestId}] GET /api/workspaces/${id}/invites failed:`, error);
    return errorJson({
      status: 500,
      code: "WORKSPACE_INVITES_FETCH_FAILED",
      message: "Failed to fetch workspace invites.",
      requestId,
    });
  }
}

export async function POST(
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
    if (member.role !== "OWNER") {
      return errorJson({ status: 403, code: "OWNER_REQUIRED", message: "Owner role required.", requestId });
    }

    const body = (await request.json()) as CreateWorkspaceInviteInput;
    const email = normalizeEmail(body.email);
    if (!email) {
      return errorJson({
        status: 400,
        code: "INVALID_INVITE_EMAIL",
        message: "有効なメールアドレスを入力してください。",
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
    const inviterName = inviter?.displayName?.trim() || inviter?.email || "ユーザー";

    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = hashInviteToken(token);
    const inviteId = crypto.randomUUID();
    const expiresAt = inviteExpiry();

    await prisma.$executeRaw`
      INSERT INTO "WorkspaceInvite" (
        "id", "workspaceId", "email", "tokenHash", "invitedByUserId", "expiresAt", "createdAt"
      )
      VALUES (
        ${inviteId}, ${id}, ${email}, ${tokenHash}, ${userId}, ${expiresAt}, NOW()
      )
    `;

    const inviteUrl = `${appBaseUrl()}/invite/${token}`;
    let mailStatus: "sent" | "failed" | "skipped" = "skipped";
    let mailError: string | null = null;

    try {
      const mailResult = await sendWorkspaceInviteMail({
        toEmail: email,
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
        inviteId,
        email,
        inviteUrl,
        expiresAt,
        mailStatus,
        mailError,
      },
      { status: 201, requestId },
    );
  } catch (error) {
    console.error(`[${requestId}] POST /api/workspaces/${id}/invites failed:`, error);
    return errorJson({
      status: 500,
      code: "WORKSPACE_INVITE_CREATE_FAILED",
      message: "Failed to create workspace invite.",
      requestId,
    });
  }
}