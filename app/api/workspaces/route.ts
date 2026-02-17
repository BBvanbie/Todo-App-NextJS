import crypto from "crypto";
import { getAuthenticatedUserId } from "@/lib/auth-guard";
import { errorJson, getRequestId, okJson } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";
import { ensurePersonalWorkspace, ensureWorkspaceSchema, listUserWorkspaces } from "@/lib/workspace";

type CreateWorkspaceInput = {
  name?: unknown;
};

function normalizeName(value: unknown) {
  if (typeof value !== "string") return null;
  const v = value.trim();
  if (!v) return null;
  if (v.length > 60) return null;
  return v;
}

export async function GET(request: Request) {
  const requestId = getRequestId(request);
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return errorJson({ status: 401, code: "UNAUTHORIZED", message: "Unauthorized.", requestId });
  }

  try {
    await ensureWorkspaceSchema();
    await ensurePersonalWorkspace(userId);
    const workspaces = await listUserWorkspaces(userId);
    return okJson(workspaces, { requestId });
  } catch (error) {
    console.error(`[${requestId}] GET /api/workspaces failed:`, error);
    return errorJson({
      status: 500,
      code: "WORKSPACES_FETCH_FAILED",
      message: "Failed to fetch workspaces.",
      requestId,
    });
  }
}

export async function POST(request: Request) {
  const requestId = getRequestId(request);
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return errorJson({ status: 401, code: "UNAUTHORIZED", message: "Unauthorized.", requestId });
  }

  try {
    await ensureWorkspaceSchema();
    const body = (await request.json()) as CreateWorkspaceInput;
    const name = normalizeName(body.name);
    if (!name) {
      return errorJson({
        status: 400,
        code: "INVALID_WORKSPACE_NAME",
        message: "ワークスペース名は1〜60文字で入力してください。",
        requestId,
      });
    }

    const workspaceId = crypto.randomUUID();
    await prisma.$executeRaw`
      INSERT INTO "Workspace" ("id", "name", "ownerUserId", "isPersonal", "createdAt", "updatedAt")
      VALUES (${workspaceId}, ${name}, ${userId}, false, NOW(), NOW())
    `;
    await prisma.$executeRaw`
      INSERT INTO "WorkspaceMember" ("workspaceId", "userId", "role", "joinedAt")
      VALUES (${workspaceId}, ${userId}, 'OWNER', NOW())
      ON CONFLICT ("workspaceId", "userId") DO NOTHING
    `;

    return okJson({ id: workspaceId, name, role: "OWNER", isPersonal: false }, { status: 201, requestId });
  } catch (error) {
    console.error(`[${requestId}] POST /api/workspaces failed:`, error);
    return errorJson({
      status: 500,
      code: "WORKSPACE_CREATE_FAILED",
      message: "Failed to create workspace.",
      requestId,
    });
  }
}