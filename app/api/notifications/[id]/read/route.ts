import { getAuthenticatedUserId } from "@/lib/auth-guard";
import { errorJson, getRequestId, okJson } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";

function parseId(id: string): number | null {
  const parsed = Number(id);
  if (!Number.isInteger(parsed) || parsed <= 0) return null;
  return parsed;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
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

  const { id } = await params;
  const notificationId = parseId(id);
  if (!notificationId) {
    return errorJson({
      status: 400,
      code: "INVALID_ID",
      message: "Invalid id.",
      requestId,
    });
  }

  try {
    const exists = await prisma.notification.findFirst({
      where: { id: notificationId, userId },
      select: { id: true },
    });
    if (!exists) {
      return errorJson({
        status: 404,
        code: "NOTIFICATION_NOT_FOUND",
        message: "Notification not found.",
        requestId,
      });
    }

    const updated = await prisma.notification.update({
      where: { id: notificationId },
      data: { readAt: new Date() },
    });

    return okJson(updated, { requestId });
  } catch (error) {
    console.error(`[${requestId}] PATCH /api/notifications/${notificationId}/read failed:`, error);
    return errorJson({
      status: 500,
      code: "NOTIFICATION_MARK_READ_FAILED",
      message: "Failed to mark notification as read.",
      requestId,
    });
  }
}
