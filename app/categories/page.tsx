"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";

const CATEGORY_LIMIT = 10;

type CategoryItem = {
  id: number;
  name: string;
};

type CategoriesResponse = {
  custom: CategoryItem[];
  builtinLabels?: Record<string, string>;
  customLimit?: number;
};

const BUILTIN_CATEGORIES = [
  "WORK",
  "PRIVATE",
  "PROCEDURE",
  "STUDY",
  "HEALTH",
  "SHOPPING",
  "OTHER",
] as const;

const DEFAULT_BUILTIN_LABELS: Record<(typeof BUILTIN_CATEGORIES)[number], string> = {
  WORK: "仕事",
  PRIVATE: "プライベート",
  PROCEDURE: "手続き",
  STUDY: "学習",
  HEALTH: "健康",
  SHOPPING: "買い物",
  OTHER: "その他",
};

async function getApiErrorMessage(response: Response, fallback: string) {
  try {
    const body = (await response.json()) as { message?: string };
    return body.message ?? fallback;
  } catch {
    return fallback;
  }
}

export default function CategoriesPage() {
  const [customCategories, setCustomCategories] = useState<CategoryItem[]>([]);
  const [builtinLabels, setBuiltinLabels] =
    useState<Record<(typeof BUILTIN_CATEGORIES)[number], string>>(DEFAULT_BUILTIN_LABELS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [createName, setCreateName] = useState("");

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [builtinEditingKey, setBuiltinEditingKey] = useState<(typeof BUILTIN_CATEGORIES)[number] | null>(null);
  const [builtinEditingName, setBuiltinEditingName] = useState("");
  const [savingBuiltin, setSavingBuiltin] = useState(false);

  const [deletingId, setDeletingId] = useState<number | null>(null);

  const fetchCategories = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/categories", { cache: "no-store" });
      if (!res.ok) throw new Error(await getApiErrorMessage(res, "カテゴリ取得に失敗しました。"));
      const data = (await res.json()) as CategoriesResponse;
      setCustomCategories(data.custom ?? []);
      if (data.builtinLabels) {
        setBuiltinLabels((current) => ({
          ...current,
          ...(data.builtinLabels as Partial<Record<(typeof BUILTIN_CATEGORIES)[number], string>>),
        }));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "カテゴリ取得に失敗しました。");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchCategories();
  }, []);

  const remaining = useMemo(() => Math.max(CATEGORY_LIMIT - customCategories.length, 0), [customCategories.length]);

  const onCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!createName.trim()) {
      setError("カテゴリ名を入力してください。");
      return;
    }

    setError(null);
    setCreating(true);
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: createName.trim() }),
      });
      if (!res.ok) throw new Error(await getApiErrorMessage(res, "カテゴリ作成に失敗しました。"));
      const created = (await res.json()) as CategoryItem;
      setCustomCategories((current) => [...current, created]);
      setCreateName("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "カテゴリ作成に失敗しました。");
    } finally {
      setCreating(false);
    }
  };

  const startEdit = (category: CategoryItem) => {
    setEditingId(category.id);
    setEditingName(category.name);
  };

  const cancelEdit = () => {
    if (savingEdit) return;
    setEditingId(null);
    setEditingName("");
  };

  const submitEdit = async (id: number) => {
    if (!editingName.trim()) {
      setError("カテゴリ名を入力してください。");
      return;
    }

    setError(null);
    setSavingEdit(true);
    try {
      const res = await fetch(`/api/categories/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editingName.trim() }),
      });
      if (!res.ok) throw new Error(await getApiErrorMessage(res, "カテゴリ更新に失敗しました。"));
      const updated = (await res.json()) as CategoryItem;
      setCustomCategories((current) => current.map((item) => (item.id === id ? updated : item)));
      setEditingId(null);
      setEditingName("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "カテゴリ更新に失敗しました。");
    } finally {
      setSavingEdit(false);
    }
  };

  const submitDelete = async (id: number) => {
    setDeletingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/categories/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await getApiErrorMessage(res, "カテゴリ削除に失敗しました。"));
      setCustomCategories((current) => current.filter((item) => item.id !== id));
      if (editingId === id) cancelEdit();
    } catch (e) {
      setError(e instanceof Error ? e.message : "カテゴリ削除に失敗しました。");
    } finally {
      setDeletingId(null);
    }
  };

  const startBuiltinEdit = (key: (typeof BUILTIN_CATEGORIES)[number]) => {
    setBuiltinEditingKey(key);
    setBuiltinEditingName(builtinLabels[key]);
  };

  const cancelBuiltinEdit = () => {
    if (savingBuiltin) return;
    setBuiltinEditingKey(null);
    setBuiltinEditingName("");
  };

  const submitBuiltinEdit = async () => {
    if (!builtinEditingKey) return;
    if (!builtinEditingName.trim()) {
      setError("カテゴリ名を入力してください。");
      return;
    }

    setSavingBuiltin(true);
    setError(null);
    try {
      const res = await fetch("/api/categories/builtin", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from: builtinEditingKey, name: builtinEditingName.trim() }),
      });
      if (!res.ok) throw new Error(await getApiErrorMessage(res, "組み込みカテゴリ更新に失敗しました。"));
      setBuiltinEditingKey(null);
      setBuiltinEditingName("");
      await fetchCategories();
    } catch (e) {
      setError(e instanceof Error ? e.message : "組み込みカテゴリ更新に失敗しました。");
    } finally {
      setSavingBuiltin(false);
    }
  };

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 md:px-8 md:py-10">
      <section className="relative overflow-hidden rounded-3xl border border-[#bfd5ef] bg-[linear-gradient(120deg,#f5faff_0%,#eef7ff_45%,#ecf3ff_100%)] p-5 shadow-[0_22px_55px_-35px_#12355d] md:p-8">
        <div className="pointer-events-none absolute -right-12 -top-14 h-40 w-40 rounded-full bg-[radial-gradient(circle,#90beff66_0%,#90beff00_72%)]" />
        <div className="pointer-events-none absolute -left-10 bottom-0 h-32 w-32 rounded-full bg-[radial-gradient(circle,#9bead566_0%,#9bead500_72%)]" />

        <div className="relative flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#4f7199]">Category Studio</p>
            <h1 className="mt-1 text-xl font-bold text-[#14355d] md:text-2xl">カテゴリ管理</h1>
            <p className="mt-1 text-sm text-[#486789]">カスタムカテゴリを追加・編集・削除できます（最大{CATEGORY_LIMIT}件）。</p>
          </div>
          <Link
            href="/"
            className="rounded-lg border border-[#c6d8ee] bg-white px-3 py-1.5 text-xs font-semibold text-[#1f4f86]"
          >
            ホームへ戻る
          </Link>
        </div>

        <div className="relative mt-5 grid gap-4 md:grid-cols-[1.1fr_1fr]">
          <form onSubmit={onCreate} className="rounded-2xl border border-[#d1e0f1] bg-white/92 p-4">
            <p className="text-sm font-semibold text-[#17355f]">新しいカテゴリを追加</p>
            <p className="mt-1 text-xs text-[#547294]">残り {remaining} 件</p>
            <div className="mt-3 flex gap-2">
              <input
                value={createName}
                onChange={(event) => setCreateName(event.target.value)}
                placeholder="例: 家計 / 顧客対応"
                maxLength={30}
                className="w-full rounded-xl border border-[#c9d8ea] bg-white px-3 py-2 text-sm"
              />
              <button
                type="submit"
                disabled={creating || customCategories.length >= CATEGORY_LIMIT}
                className="shrink-0 rounded-xl bg-[#1f5fa8] px-4 py-2 text-sm font-semibold text-white disabled:opacity-55"
              >
                {creating ? "追加中" : "追加"}
              </button>
            </div>
          </form>

          <div className="rounded-2xl border border-[#d1e0f1] bg-white/92 p-4">
            <p className="text-sm font-semibold text-[#17355f]">組み込みカテゴリ（名前編集）</p>
            <p className="mt-1 text-xs text-[#547294]">既存カテゴリ名を更新します。カスタムカテゴリは増えません。</p>
            <ul className="mt-3 grid gap-2">
              {BUILTIN_CATEGORIES.map((key) => (
                <li key={key} className="rounded-lg border border-[#d7e4f3] bg-white px-3 py-2">
                  {builtinEditingKey === key ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        value={builtinEditingName}
                        onChange={(event) => setBuiltinEditingName(event.target.value)}
                        maxLength={30}
                        className="min-w-[180px] flex-1 rounded-lg border border-[#c9d8ea] px-3 py-1.5 text-xs"
                      />
                      <button
                        type="button"
                        disabled={savingBuiltin}
                        onClick={() => void submitBuiltinEdit()}
                        className="rounded-lg bg-[#1f5fa8] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                      >
                        置換
                      </button>
                      <button
                        type="button"
                        disabled={savingBuiltin}
                        onClick={cancelBuiltinEdit}
                        className="rounded-lg border border-[#c9d8ea] px-3 py-1.5 text-xs text-[#2a4d73] disabled:opacity-60"
                      >
                        キャンセル
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-medium text-[#1a3f68]">{builtinLabels[key]}</p>
                      <button
                        type="button"
                        onClick={() => startBuiltinEdit(key)}
                        className="rounded-lg border border-[#c9d8ea] px-3 py-1.5 text-xs text-[#2a4d73]"
                      >
                        編集
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {error && (
          <p className="relative mt-4 rounded-xl border border-[#ffd4dc] bg-[#fff4f6] px-4 py-3 text-sm text-[#a31f2b]">{error}</p>
        )}

        <section className="relative mt-5 rounded-2xl border border-[#d1e0f1] bg-white/92 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[#17355f]">カスタムカテゴリ一覧</h2>
            <span className="rounded-full bg-[#ebf3ff] px-3 py-1 text-[11px] font-semibold text-[#2f5f96]">
              {customCategories.length} / {CATEGORY_LIMIT}
            </span>
          </div>

          {loading ? (
            <p className="py-4 text-sm text-[#5d7b9f]">読み込み中...</p>
          ) : customCategories.length === 0 ? (
            <p className="py-4 text-sm text-[#5d7b9f]">まだカスタムカテゴリはありません。</p>
          ) : (
            <ul className="grid gap-2">
              {customCategories.map((item) => (
                <li
                  key={item.id}
                  className="rounded-xl border border-[#d7e4f3] bg-white px-3 py-2.5"
                >
                  {editingId === item.id ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        value={editingName}
                        onChange={(event) => setEditingName(event.target.value)}
                        maxLength={30}
                        className="min-w-[220px] flex-1 rounded-lg border border-[#c9d8ea] bg-white px-3 py-1.5 text-sm"
                      />
                      <button
                        type="button"
                        disabled={savingEdit}
                        onClick={() => void submitEdit(item.id)}
                        className="rounded-lg bg-[#1f5fa8] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                      >
                        保存
                      </button>
                      <button
                        type="button"
                        disabled={savingEdit}
                        onClick={cancelEdit}
                        className="rounded-lg border border-[#c9d8ea] bg-white px-3 py-1.5 text-xs text-[#2a4d73] disabled:opacity-60"
                      >
                        キャンセル
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-medium text-[#1a3f68]">{item.name}</p>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => startEdit(item)}
                          className="rounded-lg border border-[#c9d8ea] bg-white px-3 py-1.5 text-xs text-[#2a4d73]"
                        >
                          編集
                        </button>
                        <button
                          type="button"
                          disabled={deletingId === item.id}
                          onClick={() => void submitDelete(item.id)}
                          className="rounded-lg border border-[#efb7c0] bg-[#fff2f4] px-3 py-1.5 text-xs font-semibold text-[#9e2740] disabled:opacity-60"
                        >
                          {deletingId === item.id ? "削除中" : "削除"}
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </section>
    </main>
  );
}
