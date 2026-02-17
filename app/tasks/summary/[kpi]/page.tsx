"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { formatDate, toDateInputValue, toTimeInputValue, type Todo } from "@/app/_components/todos/model";

type KpiKey = "total" | "pending" | "completed" | "dueSoon" | "overdue";

function getTokyoYmdOffset(days: number) {
  const date = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function toJstStartIso(ymd: string) {
  return new Date(`${ymd}T00:00:00+09:00`).toISOString();
}

function toJstEndIso(ymd: string) {
  return new Date(`${ymd}T23:59:59.999+09:00`).toISOString();
}

function getKpiFetchUrl(key: KpiKey) {
  if (key === "total") return "/api/todos";
  if (key === "pending") return "/api/todos?completed=false";
  if (key === "completed") return "/api/todos?completed=true";
  if (key === "dueSoon") {
    const params = new URLSearchParams({
      completed: "false",
      dueFrom: toJstStartIso(getTokyoYmdOffset(0)),
      dueTo: toJstEndIso(getTokyoYmdOffset(7)),
    });
    return `/api/todos?${params.toString()}`;
  }
  const params = new URLSearchParams({
    completed: "false",
    dueTo: toJstEndIso(getTokyoYmdOffset(-1)),
  });
  return `/api/todos?${params.toString()}`;
}

function getTitle(key: KpiKey) {
  if (key === "total") return "総タスク一覧";
  if (key === "pending") return "未完了タスク一覧";
  if (key === "completed") return "完了タスク一覧";
  if (key === "dueSoon") return "7日以内タスク一覧";
  return "期限切れタスク一覧";
}

export default function KpiSummaryPage() {
  const params = useParams<{ kpi: string }>();
  const kpi = params?.kpi as KpiKey;
  const valid = ["total", "pending", "completed", "dueSoon", "overdue"].includes(kpi);

  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const title = useMemo(() => (valid ? getTitle(kpi) : "一覧"), [kpi, valid]);

  useEffect(() => {
    if (!valid) {
      setLoading(false);
      setError("不正なKPIが指定されました。");
      return;
    }
    let cancelled = false;
    const fetchTodos = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(getKpiFetchUrl(kpi), { cache: "no-store" });
        if (!res.ok) {
          const body = (await res.json()) as { message?: string };
          throw new Error(body.message ?? "一覧の取得に失敗しました。");
        }
        const data = (await res.json()) as Todo[];
        if (!cancelled) setTodos(data);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "一覧の取得に失敗しました。");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void fetchTodos();
    return () => {
      cancelled = true;
    };
  }, [kpi, valid]);

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6 min-[768px]:px-8 min-[1280px]:py-8">
      <section className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#5b7ea5]">KPI Detail</p>
          <h1 className="text-2xl font-bold text-[#14355d]">{title}</h1>
        </div>
        <Link href="/" className="rounded-lg border border-[#cad9ea] bg-white px-3 py-1.5 text-xs font-semibold text-[#2f5889]">
          ホームへ戻る
        </Link>
      </section>

      {loading ? (
        <p className="rounded-xl border border-[#d7e5f5] bg-white/85 px-4 py-3 text-sm text-[#557493]">読み込み中...</p>
      ) : error ? (
        <p className="rounded-xl border border-[#ffd4dc] bg-[#fff4f6] px-4 py-3 text-sm text-[#a31f2b]">{error}</p>
      ) : todos.length === 0 ? (
        <p className="rounded-xl border border-[#d7e5f5] bg-white/85 px-4 py-3 text-sm text-[#557493]">該当タスクはありません。</p>
      ) : (
        <ul className="space-y-2">
          {todos.map((todo) => (
            <li key={todo.id} className="rounded-xl border border-[#d8e6f5] bg-[#fbfdff] p-3">
              <p className="text-sm font-semibold text-[#163960]">{todo.title}</p>
              <p className="mt-1 text-xs text-[#47688f]">期限: {formatDate(todo.dueAt)} {toTimeInputValue(todo.dueAt)}</p>
              <p className="mt-1 text-xs text-[#47688f]">開始: {todo.startAt ? `${toDateInputValue(todo.startAt)} ${toTimeInputValue(todo.startAt)}` : toDateInputValue(todo.createdAt)}</p>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
