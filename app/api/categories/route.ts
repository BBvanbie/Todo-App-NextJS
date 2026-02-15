import { getAuthenticatedUserId } from "@/lib/auth-guard";
import { errorJson, getRequestId, okJson } from "@/lib/api-response";
import {
  BUILTIN_CATEGORIES,
  CATEGORY_LIMIT,
  getUserBuiltinLabelMap,
  getUserCustomCategories,
  normalizeCategoryInput,
} from "@/lib/categories";
import { prisma } from "@/lib/prisma";

type CreateCategoryInput = {
  name?: unknown;
};

export async function GET(request: Request) {
  const requestId = getRequestId(request);
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return errorJson({ status: 401, code: "UNAUTHORIZED", message: "Unauthorized.", requestId });
  }

  try {
    const custom = await getUserCustomCategories(userId);
    const builtinLabels = await getUserBuiltinLabelMap(userId);
    return okJson(
      {
        builtin: [...BUILTIN_CATEGORIES],
        builtinLabels,
        custom,
        all: [...BUILTIN_CATEGORIES, ...custom.map((item) => item.name)],
        customLimit: CATEGORY_LIMIT,
      },
      { requestId },
    );
  } catch (error) {
    console.error(`[${requestId}] GET /api/categories failed:`, error);
    return errorJson({
      status: 500,
      code: "CATEGORIES_FETCH_FAILED",
      message: "Failed to fetch categories.",
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
    const body = (await request.json()) as CreateCategoryInput;
    const name = normalizeCategoryInput(body.name);
    if (!name) {
      return errorJson({
        status: 400,
        code: "INVALID_CATEGORY_NAME",
        message: "カテゴリ名は1〜30文字で入力してください。",
        requestId,
      });
    }

    if (BUILTIN_CATEGORIES.includes(name as (typeof BUILTIN_CATEGORIES)[number])) {
      return errorJson({
        status: 400,
        code: "BUILTIN_CATEGORY_RESERVED",
        message: "このカテゴリ名は予約済みです。",
        requestId,
      });
    }

    const custom = await getUserCustomCategories(userId);
    if (custom.length >= CATEGORY_LIMIT) {
      return errorJson({
        status: 400,
        code: "CATEGORY_LIMIT_EXCEEDED",
        message: `カスタムカテゴリは最大${CATEGORY_LIMIT}件までです。`,
        requestId,
      });
    }

    if (custom.some((item) => item.name.toLowerCase() === name.toLowerCase())) {
      return errorJson({
        status: 409,
        code: "CATEGORY_ALREADY_EXISTS",
        message: "同名のカテゴリが既に存在します。",
        requestId,
      });
    }

    const createdRows = await prisma.$queryRaw<Array<{ id: number; name: string }>>`
      INSERT INTO "UserCategory" ("userId", "name")
      VALUES (${userId}, ${name})
      RETURNING "id", "name"
    `;

    return okJson(createdRows[0], { status: 201, requestId });
  } catch (error) {
    console.error(`[${requestId}] POST /api/categories failed:`, error);
    return errorJson({
      status: 500,
      code: "CATEGORY_CREATE_FAILED",
      message: "カテゴリ作成に失敗しました。",
      requestId,
    });
  }
}
