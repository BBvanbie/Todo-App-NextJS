"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

type Todo = {
  id: number;
  title: string;
  completed: boolean;
  dueAt: string;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

function toDateInputValue(isoString: string) {
  const date = new Date(isoString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toIsoAtNoon(localDateInput: string) {
  return new Date(`${localDateInput}T12:00:00`).toISOString();
}

function formatDate(isoString: string) {
  return new Intl.DateTimeFormat("ja-JP", {
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  }).format(new Date(isoString));
}

function getDueStatus(isoString: string) {
  const due = new Date(isoString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const twoDaysLater = new Date(today);
  twoDaysLater.setDate(twoDaysLater.getDate() + 2);

  if (due < today) return "danger";
  if (due <= twoDaysLater) return "warning";
  return "ok";
}

export default function Home() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newTitle, setNewTitle] = useState("");
  const [newDueDate, setNewDueDate] = useState("");
  const [saving, setSaving] = useState(false);

  const [editing, setEditing] = useState<Todo | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDueDate, setEditDueDate] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  const [showCongrats, setShowCongrats] = useState(false);
  const [congratsKey, setCongratsKey] = useState(0);
  const congratsTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const fetchTodos = async () => {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch("/api/todos", { cache: "no-store" });
        if (!res.ok) throw new Error("Todoの取得に失敗しました。");
        const data = (await res.json()) as Todo[];
        setTodos(data);
      } catch {
        setError("Todoの取得に失敗しました。");
      } finally {
        setLoading(false);
      }
    };

    void fetchTodos();
  }, []);

  useEffect(() => {
    return () => {
      if (congratsTimerRef.current) {
        window.clearTimeout(congratsTimerRef.current);
      }
    };
  }, []);

  const pendingTodos = useMemo(
    () =>
      todos
        .filter((todo) => !todo.completed)
        .sort(
          (a, b) =>
            new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime() ||
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        ),
    [todos],
  );

  const completedActiveTodos = useMemo(
    () =>
      todos
        .filter((todo) => todo.completed)
        .sort(
          (a, b) =>
            new Date(b.completedAt ?? b.updatedAt).getTime() -
            new Date(a.completedAt ?? a.updatedAt).getTime(),
        ),
    [todos],
  );

  const completedCount = useMemo(
    () => todos.filter((todo) => todo.completed).length,
    [todos],
  );

  const overdueCount = pendingTodos.filter(
    (todo) => getDueStatus(todo.dueAt) === "danger",
  ).length;

  const triggerCongrats = () => {
    setCongratsKey((prev) => prev + 1);
    setShowCongrats(true);
    if (congratsTimerRef.current) window.clearTimeout(congratsTimerRef.current);
    congratsTimerRef.current = window.setTimeout(() => setShowCongrats(false), 1800);
  };

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!newTitle.trim()) return setError("タイトルは必須です。");
    if (!newDueDate) return setError("期限は必須です。");

    setError(null);
    setSaving(true);

    const optimisticId = -Date.now();
    const dueAt = toIsoAtNoon(newDueDate);

    const optimisticTodo: Todo = {
      id: optimisticId,
      title: newTitle.trim(),
      completed: false,
      dueAt,
      completedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setTodos((prev) => [...prev, optimisticTodo]);
    setNewTitle("");
    setNewDueDate("");

    try {
      const res = await fetch("/api/todos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: optimisticTodo.title,
          dueAt,
        }),
      });

      if (!res.ok) throw new Error();
      const saved = (await res.json()) as Todo;
      setTodos((prev) => prev.map((todo) => (todo.id === optimisticId ? saved : todo)));
    } catch {
      setTodos((prev) => prev.filter((todo) => todo.id !== optimisticId));
      setError("追加に失敗しました。");
      setNewTitle(optimisticTodo.title);
      setNewDueDate(newDueDate);
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (todo: Todo) => {
    const nextCompleted = !todo.completed;
    const previous = todo;
    const optimistic: Todo = {
      ...todo,
      completed: nextCompleted,
      completedAt: nextCompleted ? new Date().toISOString() : null,
      updatedAt: new Date().toISOString(),
    };

    setTodos((prev) => prev.map((item) => (item.id === todo.id ? optimistic : item)));
    if (nextCompleted) triggerCongrats();

    try {
      const res = await fetch(`/api/todos/${todo.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: nextCompleted }),
      });
      if (!res.ok) throw new Error();
      const saved = (await res.json()) as Todo;
      setTodos((prev) => prev.map((item) => (item.id === todo.id ? saved : item)));
    } catch {
      setTodos((prev) => prev.map((item) => (item.id === todo.id ? previous : item)));
      setError("状態更新に失敗しました。");
    }
  };

  const handleDelete = async (todo: Todo) => {
    if (!window.confirm(`"${todo.title}" を削除しますか？`)) return;
    const previous = todo;

    setTodos((prev) => prev.filter((item) => item.id !== todo.id));
    setError(null);

    try {
      const res = await fetch(`/api/todos/${todo.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
    } catch {
      setTodos((prev) => [...prev, previous]);
      setError("削除に失敗しました。");
    }
  };

  const openEdit = (todo: Todo) => {
    setEditing(todo);
    setEditTitle(todo.title);
    setEditDueDate(toDateInputValue(todo.dueAt));
    setError(null);
  };

  const closeEdit = () => {
    setEditing(null);
    setEditTitle("");
    setEditDueDate("");
    setEditSaving(false);
  };

  const handleEdit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editing) return;
    if (!editTitle.trim()) return setError("タイトルは必須です。");
    if (!editDueDate) return setError("期限は必須です。");

    setError(null);
    setEditSaving(true);

    const previous = editing;
    const optimisticDueAt = toIsoAtNoon(editDueDate);
    const optimistic: Todo = {
      ...editing,
      title: editTitle.trim(),
      dueAt: optimisticDueAt,
      updatedAt: new Date().toISOString(),
    };

    setTodos((prev) => prev.map((todo) => (todo.id === editing.id ? optimistic : todo)));

    try {
      const res = await fetch(`/api/todos/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: optimistic.title,
          dueAt: optimisticDueAt,
        }),
      });

      if (!res.ok) throw new Error();
      const saved = (await res.json()) as Todo;
      setTodos((prev) => prev.map((todo) => (todo.id === editing.id ? saved : todo)));
      closeEdit();
    } catch {
      setTodos((prev) => prev.map((todo) => (todo.id === editing.id ? previous : todo)));
      setError("編集に失敗しました。");
      setEditSaving(false);
    }
  };

  return (
    <div className="relative min-h-screen">
      <div className="soft-grid pointer-events-none fixed inset-0 z-0" />

      {showCongrats && (
        <div
          key={congratsKey}
          className="congrats-enter fixed top-4 left-1/2 z-50 w-[min(92vw,680px)] -translate-x-1/2 rounded-2xl border border-[#8bd8b4] bg-[#e8fff2] px-4 py-4 text-center shadow-lg"
          role="status"
          aria-live="polite"
        >
          <p className="text-xl font-bold tracking-tight text-[#0a6f4f]">
            congratulation
          </p>
          <p className="text-sm text-[#1f7f61]">くす玉 + クラッカー 🎊🎉</p>
          <div className="pointer-events-none absolute inset-x-0 top-1">
            {Array.from({ length: 12 }).map((_, index) => (
              <span
                key={index}
                className="confetti absolute text-sm"
                style={{ left: `${6 + index * 8}%`, animationDelay: `${index * 20}ms` }}
              >
                {index % 2 === 0 ? "✨" : "🎉"}
              </span>
            ))}
          </div>
        </div>
      )}

      <main className="relative z-10 mx-auto w-full max-w-6xl px-4 py-6 md:px-8 md:py-10">
        <section className="glass-card rounded-3xl p-6 md:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#2f5f95]">
                Task Radar
              </p>
              <h1 className="mt-1 text-3xl font-bold tracking-tight text-[#0f1f35]">
                Next Todos Dashboard
              </h1>
              <p className="mt-2 text-sm text-muted">
                期限が近い順で、今やるべきタスクを上から表示します。
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2 text-sm md:min-w-[280px]">
              <div className="rounded-xl bg-[#edf5ff] p-3 text-center">
                <p className="text-xs text-[#4f6e94]">未完了</p>
                <p className="text-lg font-bold text-[#0b4ea7]">{pendingTodos.length}</p>
              </div>
              <div className="rounded-xl bg-[#fff3e3] p-3 text-center">
                <p className="text-xs text-[#8c5a14]">期限切れ</p>
                <p className="text-lg font-bold text-[#b94d00]">{overdueCount}</p>
              </div>
              <div className="rounded-xl bg-[#e8fff6] p-3 text-center">
                <p className="text-xs text-[#2d7160]">完了総数</p>
                <p className="text-lg font-bold text-[#127656]">{completedCount}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-5 grid gap-5 lg:grid-cols-[1.3fr_2fr]">
          <form onSubmit={handleCreate} className="glass-card rounded-3xl p-5">
            <h2 className="text-lg font-semibold text-[#12325a]">タスク登録</h2>
            <div className="mt-4 space-y-3">
              <label className="block text-sm text-muted" htmlFor="title">
                タイトル
              </label>
              <input
                id="title"
                value={newTitle}
                onChange={(event) => setNewTitle(event.target.value)}
                placeholder="例: 見積もり送付"
                className="w-full rounded-xl border border-[#c9d8ea] bg-white px-3 py-2 text-sm outline-none ring-primary/20 focus:ring-4"
              />
              <label className="block text-sm text-muted" htmlFor="dueAt">
                期限（日付のみ）
              </label>
              <input
                id="dueAt"
                type="date"
                value={newDueDate}
                onChange={(event) => setNewDueDate(event.target.value)}
                className="w-full rounded-xl border border-[#c9d8ea] bg-white px-3 py-2 text-sm outline-none ring-primary/20 focus:ring-4"
              />
              <button
                type="submit"
                disabled={saving}
                className="mt-2 w-full rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "登録中..." : "タスクを追加"}
              </button>
            </div>
          </form>

          <section className="glass-card rounded-3xl p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[#12325a]">未完了タスク</h2>
              <span className="rounded-full bg-[#edf5ff] px-3 py-1 text-xs font-semibold text-[#1157b2]">
                期限が近い順
              </span>
            </div>

            {loading ? (
              <p className="py-8 text-sm text-muted">読み込み中...</p>
            ) : pendingTodos.length === 0 ? (
              <p className="py-8 text-sm text-muted">未完了タスクはありません。</p>
            ) : (
              <ul className="space-y-3">
                {pendingTodos.map((todo) => {
                  const status = getDueStatus(todo.dueAt);
                  const cardTone =
                    status === "danger"
                      ? "border-[#ef9ca7] bg-[#ffecee]"
                      : status === "warning"
                        ? "border-[#ffc882] bg-[#fff5e8]"
                        : "border-[#d7e1ee] bg-white/90";

                  return (
                    <li
                      key={todo.id}
                      className={`rounded-2xl border p-3 shadow-[0_8px_20px_-20px_#0d315f] ${cardTone}`}
                    >
                      <div className="flex items-start gap-3">
                        <button
                          type="button"
                          onClick={() => void handleToggle(todo)}
                          className="mt-1 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-[#9fb5cd] text-[#2f5f95] transition hover:bg-[#eaf2fc]"
                          aria-label={`${todo.title}を完了にする`}
                        >
                          ✓
                        </button>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-[#17355f]">
                            {todo.title}
                          </p>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                            <span className="rounded-full bg-[#edf3fa] px-2 py-0.5 text-[#4e6785]">
                              期限: {formatDate(todo.dueAt)}
                            </span>
                            {status === "warning" && (
                              <span className="badge-status-warning rounded-full px-2 py-0.5">
                                注意
                              </span>
                            )}
                            {status === "danger" && (
                              <span className="badge-status-danger rounded-full px-2 py-0.5">
                                警告
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex shrink-0 gap-1">
                          <button
                            type="button"
                            onClick={() => openEdit(todo)}
                            className="rounded-lg border border-[#c9d7e7] px-2 py-1 text-xs text-[#2d4f7d] hover:bg-[#edf5ff]"
                          >
                            編集
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleDelete(todo)}
                            className="rounded-lg border border-[#f1c7cd] px-2 py-1 text-xs text-[#a2202d] hover:bg-[#fff0f3]"
                          >
                            削除
                          </button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </section>

        <section className="mt-5 glass-card rounded-3xl p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[#12325a]">完了タスク（7日以内）</h2>
            <Link
              href="/history"
              className="rounded-lg border border-[#c6d8ee] bg-[#edf5ff] px-3 py-1 text-xs font-semibold text-[#134b99] hover:brightness-95"
            >
              履歴を見る
            </Link>
          </div>
          {completedActiveTodos.length === 0 ? (
            <p className="py-6 text-sm text-muted">表示対象の完了タスクはありません。</p>
          ) : (
            <ul className="space-y-3">
              {completedActiveTodos.map((todo) => (
                <li
                  key={todo.id}
                  className="rounded-2xl border border-[#d0e8df] bg-[#f5fffa] p-3"
                >
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      onClick={() => void handleToggle(todo)}
                      className="mt-1 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-[#8cd7be] bg-[#16a078] text-white"
                      aria-label={`${todo.title}を未完了に戻す`}
                    >
                      ✓
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-[#4a6a60] line-through">{todo.title}</p>
                      <p className="mt-1 text-xs text-[#5f7f74]">
                        完了: {formatDate(todo.completedAt ?? todo.updatedAt)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleDelete(todo)}
                      className="rounded-lg border border-[#f1c7cd] px-2 py-1 text-xs text-[#a2202d] hover:bg-[#fff0f3]"
                    >
                      削除
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {error && (
          <p className="mt-4 rounded-xl border border-[#ffd4dc] bg-[#fff4f6] px-4 py-3 text-sm text-[#a31f2b]">
            {error}
          </p>
        )}
      </main>

      {editing && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#0f1f35]/45 px-4">
          <div className="glass-card w-full max-w-lg rounded-2xl p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-[#17355f]">タスク編集</h3>
              <button
                type="button"
                onClick={closeEdit}
                className="rounded-lg border border-[#cfdbeb] px-2 py-1 text-xs text-[#47658a] hover:bg-[#edf5ff]"
              >
                閉じる
              </button>
            </div>
            <form onSubmit={handleEdit} className="space-y-3">
              <label className="block text-sm text-muted" htmlFor="editTitle">
                タイトル
              </label>
              <input
                id="editTitle"
                value={editTitle}
                onChange={(event) => setEditTitle(event.target.value)}
                className="w-full rounded-xl border border-[#c9d8ea] bg-white px-3 py-2 text-sm outline-none ring-primary/20 focus:ring-4"
              />
              <label className="block text-sm text-muted" htmlFor="editDueAt">
                期限（日付のみ）
              </label>
              <input
                id="editDueAt"
                type="date"
                value={editDueDate}
                onChange={(event) => setEditDueDate(event.target.value)}
                className="w-full rounded-xl border border-[#c9d8ea] bg-white px-3 py-2 text-sm outline-none ring-primary/20 focus:ring-4"
              />
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeEdit}
                  className="rounded-xl border border-[#cfdbeb] px-4 py-2 text-sm text-[#47658a] hover:bg-[#edf5ff]"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={editSaving}
                  className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {editSaving ? "保存中..." : "保存"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
