"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { TaskCalendarPanel } from "@/app/_components/todos/TaskCalendarPanel";
import type { Todo } from "@/app/_components/todos/model";

type ErrorResponse = { message?: string };

export default function CalendarPage() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const fetchTodos = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/todos?completed=false", { cache: "no-store" });
        if (!res.ok) {
          const body = (await res.json()) as ErrorResponse;
          throw new Error(body.message ?? "カレンダー用データの取得に失敗しました。");
        }
        const data = (await res.json()) as Todo[];
        if (!cancelled) setTodos(data);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "カレンダー用データの取得に失敗しました。");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void fetchTodos();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8">
      <section className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#5b7ea5]">
            Calendar View
          </p>
          <h1 className="text-2xl font-bold text-[#14355d]">タスク期間カレンダー</h1>
        </div>
        <Link
          href="/"
          className="rounded-lg border border-[#cad9ea] bg-white px-3 py-1.5 text-xs font-semibold text-[#2f5889]"
        >
          ダッシュボードへ戻る
        </Link>
      </section>

      {loading ? (
        <p className="rounded-xl border border-[#d7e5f5] bg-white/85 px-4 py-3 text-sm text-[#557493]">
          読み込み中...
        </p>
      ) : error ? (
        <p className="rounded-xl border border-[#ffd4dc] bg-[#fff4f6] px-4 py-3 text-sm text-[#a31f2b]">
          {error}
        </p>
      ) : (
        <TaskCalendarPanel todos={todos} />
      )}
    </main>
  );
}

