import { getAuthenticatedUserId } from "@/lib/auth-guard";
import { errorJson, getRequestId, okJson } from "@/lib/api-response";
import {
  BUILTIN_CATEGORIES,
  ensureTodoCategoryColumnText,
  ensureUserCategoryTable,
  normalizeCategoryInput,
} from "@/lib/categories";
import { prisma } from "@/lib/prisma";

type UpdateCategoryInput = {
  name?: unknown;
};

function parseId(id: string): number | null {
  const n = Number(id);
  if (!Number.isInteger(n) || n <= 0) return null;
  return n;
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
  const categoryId = parseId(id);
  if (!categoryId) {
    return errorJson({ status: 400, code: "INVALID_ID", message: "Invalid id.", requestId });
  }

  try {
    await ensureUserCategoryTable();
    await ensureTodoCategoryColumnText();

    const body = (await request.json()) as UpdateCategoryInput;
    const newName = normalizeCategoryInput(body.name);
    if (!newName) {
      return errorJson({
        status: 400,
        code: "INVALID_CATEGORY_NAME",
        message: "カテゴリ名は1〜30文字で入力してください。",
        requestId,
      });
    }

    if (BUILTIN_CATEGORIES.includes(newName as (typeof BUILTIN_CATEGORIES)[number])) {
      return errorJson({
        status: 400,
        code: "BUILTIN_CATEGORY_RESERVED",
        message: "このカテゴリ名は予約済みです。",
        requestId,
      });
    }

    const currentRows = await prisma.$queryRaw<Array<{ id: number; name: string }>>`
      SELECT "id", "name"
      FROM "UserCategory"
      WHERE "id" = ${categoryId}
        AND "userId" = ${userId}
      LIMIT 1
    `;
    const current = currentRows[0];
    if (!current) {
      return errorJson({
        status: 404,
        code: "CATEGORY_NOT_FOUND",
        message: "カテゴリが見つかりません。",
        requestId,
      });
    }

    const duplicateRows = await prisma.$queryRaw<Array<{ exists: boolean }>>`
      SELECT EXISTS (
        SELECT 1
        FROM "UserCategory"
        WHERE "userId" = ${userId}
          AND "id" <> ${categoryId}
          AND lower("name") = lower(${newName})
      ) AS "exists"
    `;
    if (duplicateRows[0]?.exists) {
      return errorJson({
        status: 409,
        code: "CATEGORY_ALREADY_EXISTS",
        message: "同名のカテゴリが既に存在します。",
        requestId,
      });
    }

    await prisma.$executeRaw`
      UPDATE "UserCategory"
      SET "name" = ${newName},
          "updatedAt" = NOW()
      WHERE "id" = ${categoryId}
        AND "userId" = ${userId}
    `;

    await prisma.$executeRaw`
      UPDATE "Todo"
      SET "category" = ${newName},
          "updatedAt" = NOW()
      WHERE "userId" = ${userId}
        AND lower("category") = lower(${current.name})
    `;

    return okJson({ id: categoryId, name: newName }, { requestId });
  } catch (error) {
    console.error(`[${requestId}] PATCH /api/categories/${categoryId} failed:`, error);
    return errorJson({
      status: 500,
      code: "CATEGORY_UPDATE_FAILED",
      message: "カテゴリ更新に失敗しました。",
      requestId,
    });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const requestId = getRequestId(request);
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return errorJson({ status: 401, code: "UNAUTHORIZED", message: "Unauthorized.", requestId });
  }

  const { id } = await params;
  const categoryId = parseId(id);
  if (!categoryId) {
    return errorJson({ status: 400, code: "INVALID_ID", message: "Invalid id.", requestId });
  }

  try {
    await ensureUserCategoryTable();
    await ensureTodoCategoryColumnText();

    const rows = await prisma.$queryRaw<Array<{ id: number; name: string }>>`
      SELECT "id", "name"
      FROM "UserCategory"
      WHERE "id" = ${categoryId}
        AND "userId" = ${userId}
      LIMIT 1
    `;
    const target = rows[0];
    if (!target) {
      return errorJson({
        status: 404,
        code: "CATEGORY_NOT_FOUND",
        message: "カテゴリが見つかりません。",
        requestId,
      });
    }

    await prisma.$executeRaw`
      UPDATE "Todo"
      SET "category" = 'OTHER',
          "updatedAt" = NOW()
      WHERE "userId" = ${userId}
        AND lower("category") = lower(${target.name})
    `;

    await prisma.$executeRaw`
      DELETE FROM "UserCategory"
      WHERE "id" = ${categoryId}
        AND "userId" = ${userId}
    `;

    return okJson({ deletedId: categoryId }, { requestId });
  } catch (error) {
    console.error(`[${requestId}] DELETE /api/categories/${categoryId} failed:`, error);
    return errorJson({
      status: 500,
      code: "CATEGORY_DELETE_FAILED",
      message: "カテゴリ削除に失敗しました。",
      requestId,
    });
  }
}
