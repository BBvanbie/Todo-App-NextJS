import { getAuthenticatedUserId } from "@/lib/auth-guard";
import { errorJson, getRequestId, okJson } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";
import { ensureWorkspaceSchema, resolveWorkspaceForUser } from "@/lib/workspace";

type UpdateWorkspaceInput = {
  name?: unknown;
};

function normalizeName(value: unknown) {
  if (typeof value !== "string") return null;
  const v = value.trim();
  if (!v || v.length > 60) return null;
  return v;
}

export async function PATCH(
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

    const body = (await request.json()) as UpdateWorkspaceInput;
    const name = normalizeName(body.name);
    if (!name) {
      return errorJson({
        status: 400,
        code: "INVALID_WORKSPACE_NAME",
        message: "ワークスペース名は1〜60文字で入力してください。",
        requestId,
      });
    }

    await prisma.$executeRaw`
      UPDATE "Workspace"
      SET "name" = ${name},
          "updatedAt" = NOW()
      WHERE "id" = ${id}
    `;

    return okJson({ id, name }, { requestId });
  } catch (error) {
    console.error(`[${requestId}] PATCH /api/workspaces/${id} failed:`, error);
    return errorJson({
      status: 500,
      code: "WORKSPACE_UPDATE_FAILED",
      message: "Failed to update workspace.",
      requestId,
    });
  }
}