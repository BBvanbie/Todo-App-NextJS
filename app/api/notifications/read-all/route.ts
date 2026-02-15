import { getAuthenticatedUserId } from "@/lib/auth-guard";
import { errorJson, getRequestId, okJson } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: Request) {
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
    const updatedCount = await prisma.$executeRaw`
      UPDATE "Notification"
      SET "readAt" = NOW()
      WHERE "readAt" IS NULL
        AND "userId" = ${userId}
    `;

    return okJson({ updatedCount }, { requestId });
  } catch (error) {
    console.error(`[${requestId}] PATCH /api/notifications/read-all failed:`, error);
    return errorJson({
      status: 500,
      code: "NOTIFICATIONS_READ_ALL_FAILED",
      message: "Failed to mark all notifications as read.",
      requestId,
    });
  }
}
