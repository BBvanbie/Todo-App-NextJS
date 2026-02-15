import { getAuthenticatedUserId } from "@/lib/auth-guard";
import { errorJson, getRequestId, okJson } from "@/lib/api-response";
import {
  ensureUserBuiltinLabelTable,
  getBuiltinDefaultLabelMap,
  isBuiltinCategory,
  normalizeCategoryInput,
  upsertUserBuiltinLabel,
} from "@/lib/categories";

type UpdateBuiltinCategoryInput = {
  from?: unknown;
  name?: unknown;
};

export async function PATCH(request: Request) {
  const requestId = getRequestId(request);
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return errorJson({ status: 401, code: "UNAUTHORIZED", message: "Unauthorized.", requestId });
  }

  try {
    await ensureUserBuiltinLabelTable();

    const body = (await request.json()) as UpdateBuiltinCategoryInput;
    const from = typeof body.from === "string" ? body.from.trim() : "";
    const name = normalizeCategoryInput(body.name);

    if (!from || !isBuiltinCategory(from)) {
      return errorJson({
        status: 400,
        code: "INVALID_SOURCE_CATEGORY",
        message: "編集対象カテゴリが不正です。",
        requestId,
      });
    }

    if (!name) {
      return errorJson({
        status: 400,
        code: "INVALID_CATEGORY_NAME",
        message: "カテゴリ名は1〜30文字で入力してください。",
        requestId,
      });
    }

    const defaults = getBuiltinDefaultLabelMap();
    if (name === defaults[from]) {
      await upsertUserBuiltinLabel(userId, from, defaults[from]);
      return okJson({ from, label: defaults[from] }, { requestId });
    }

    await upsertUserBuiltinLabel(userId, from, name);

    return okJson({ from, label: name }, { requestId });
  } catch (error) {
    console.error(`[${requestId}] PATCH /api/categories/builtin failed:`, error);
    return errorJson({
      status: 500,
      code: "BUILTIN_CATEGORY_UPDATE_FAILED",
      message: "組み込みカテゴリの更新に失敗しました。",
      requestId,
    });
  }
}
