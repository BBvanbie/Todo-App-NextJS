"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

type TodoCategory =
  | "WORK"
  | "PRIVATE"
  | "PROCEDURE"
  | "STUDY"
  | "HEALTH"
  | "SHOPPING"
  | "OTHER";

type TodoPriority = "HIGH" | "MEDIUM" | "LOW";

type Todo = {
  id: number;
  title: string;
  memo: string | null;
  category: TodoCategory;
  priority: TodoPriority;
  completed: boolean;
  dueAt: string;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

const CATEGORY_LABEL: Record<TodoCategory, string> = {
  WORK: "Work",
  PRIVATE: "Private",
  PROCEDURE: "Procedure",
  STUDY: "Study",
  HEALTH: "Health",
  SHOPPING: "Shopping",
  OTHER: "Other",
};

const PRIORITY_LABEL: Record<TodoPriority, string> = {
  HIGH: "High",
  MEDIUM: "Medium",
  LOW: "Low",
};

function formatDate(isoString: string) {
  return new Intl.DateTimeFormat("ja-JP", {
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  }).format(new Date(isoString));
}

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

function getDueStatus(isoString: string): "ok" | "warning" | "danger" {
  const due = new Date(isoString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const twoDaysLater = new Date(today);
  twoDaysLater.setDate(twoDaysLater.getDate() + 2);

  if (due < today) return "danger";
  if (due <= twoDaysLater) return "warning";
  return "ok";
}

function getCardTone(status: "ok" | "warning" | "danger") {
  if (status === "danger") return "border-[#f1a6ae] bg-[#ffeef0]";
  if (status === "warning") return "border-[#ffd18f] bg-[#fff6e9]";
  return "border-[#d7e1ee] bg-white/90";
}

export default function Home() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editing, setEditing] = useState<Todo | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editMemo, setEditMemo] = useState("");
  const [editCategory, setEditCategory] = useState<TodoCategory>("OTHER");
  const [editPriority, setEditPriority] = useState<TodoPriority>("MEDIUM");
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
        if (!res.ok) throw new Error();
        const data = (await res.json()) as Todo[];
        setTodos(data);
      } catch {
        setError("Failed to fetch todos.");
      } finally {
        setLoading(false);
      }
    };
    void fetchTodos();
  }, []);

  useEffect(() => {
    return () => {
      if (congratsTimerRef.current) window.clearTimeout(congratsTimerRef.current);
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

  const completedTodos = useMemo(
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

  const overdueCount = pendingTodos.filter(
    (todo) => getDueStatus(todo.dueAt) === "danger",
  ).length;

  const triggerCongrats = () => {
    setCongratsKey((prev) => prev + 1);
    setShowCongrats(true);
    if (congratsTimerRef.current) window.clearTimeout(congratsTimerRef.current);
    congratsTimerRef.current = window.setTimeout(() => setShowCongrats(false), 1800);
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
      setError("Failed to update status.");
    }
  };

  const handleDelete = async (todo: Todo) => {
    if (!window.confirm(`Delete "${todo.title}"?`)) return;
    const backup = todo;
    setTodos((prev) => prev.filter((item) => item.id !== todo.id));
    setError(null);

    try {
      const res = await fetch(`/api/todos/${todo.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
    } catch {
      setTodos((prev) => [...prev, backup]);
      setError("Failed to delete.");
    }
  };

  const openEdit = (todo: Todo) => {
    setEditing(todo);
    setEditTitle(todo.title);
    setEditMemo(todo.memo ?? "");
    setEditCategory(todo.category);
    setEditPriority(todo.priority);
    setEditDueDate(toDateInputValue(todo.dueAt));
    setError(null);
  };

  const closeEdit = () => {
    setEditing(null);
    setEditTitle("");
    setEditMemo("");
    setEditCategory("OTHER");
    setEditPriority("MEDIUM");
    setEditDueDate("");
    setEditSaving(false);
  };

  const handleEdit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editing) return;
    if (!editTitle.trim()) return setError("Title is required.");
    if (!editDueDate) return setError("Due date is required.");

    setError(null);
    setEditSaving(true);
    const dueAt = toIsoAtNoon(editDueDate);
    const previous = editing;
    const optimistic: Todo = {
      ...editing,
      title: editTitle.trim(),
      memo: editMemo.trim() || null,
      category: editCategory,
      priority: editPriority,
      dueAt,
      updatedAt: new Date().toISOString(),
    };

    setTodos((prev) => prev.map((todo) => (todo.id === editing.id ? optimistic : todo)));

    try {
      const res = await fetch(`/api/todos/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: optimistic.title,
          memo: optimistic.memo,
          category: optimistic.category,
          priority: optimistic.priority,
          dueAt,
        }),
      });
      if (!res.ok) throw new Error();
      const saved = (await res.json()) as Todo;
      setTodos((prev) => prev.map((todo) => (todo.id === editing.id ? saved : todo)));
      closeEdit();
    } catch {
      setTodos((prev) => prev.map((todo) => (todo.id === editing.id ? previous : todo)));
      setEditSaving(false);
      setError("Failed to update todo.");
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
          <p className="text-xl font-bold tracking-tight text-[#0a6f4f]">congratulation</p>
          <p className="text-sm text-[#1f7f61]">Great job, task completed.</p>
        </div>
      )}

      <main className="relative z-10 mx-auto w-full max-w-6xl px-4 py-6 md:px-8 md:py-10">
        <section className="glass-card rounded-3xl p-6 md:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#2f5f95]">
                Task Radar
              </p>
              <h1 className="mt-1 text-3xl font-bold tracking-tight text-[#0f1f35]">Next Todos</h1>
              <p className="mt-2 text-sm text-muted">
                Pending tasks are sorted by nearest due date.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-xl bg-[#edf5ff] px-4 py-2 text-center">
                <p className="text-xs text-[#4f6e94]">Pending</p>
                <p className="text-lg font-bold text-[#0b4ea7]">{pendingTodos.length}</p>
              </div>
              <div className="rounded-xl bg-[#fff3e3] px-4 py-2 text-center">
                <p className="text-xs text-[#8c5a14]">Overdue</p>
                <p className="text-lg font-bold text-[#b94d00]">{overdueCount}</p>
              </div>
              <div className="rounded-xl bg-[#e8fff6] px-4 py-2 text-center">
                <p className="text-xs text-[#2d7160]">Completed</p>
                <p className="text-lg font-bold text-[#127656]">{completedTodos.length}</p>
              </div>
              <Link
                href="/tasks/new"
                className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:brightness-110"
              >
                Add Task
              </Link>
            </div>
          </div>
        </section>

        <section className="mt-5 glass-card rounded-3xl p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[#12325a]">Pending Tasks</h2>
            <span className="rounded-full bg-[#edf5ff] px-3 py-1 text-xs font-semibold text-[#1157b2]">
              Nearest due first
            </span>
          </div>

          {loading ? (
            <p className="py-8 text-sm text-muted">Loading...</p>
          ) : pendingTodos.length === 0 ? (
            <p className="py-8 text-sm text-muted">No pending tasks.</p>
          ) : (
            <ul className="space-y-3">
              {pendingTodos.map((todo) => {
                const status = getDueStatus(todo.dueAt);
                return (
                  <li
                    key={todo.id}
                    className={`rounded-2xl border p-3 shadow-[0_8px_20px_-20px_#0d315f] ${getCardTone(status)}`}
                  >
                    <div className="flex items-start gap-3">
                      <button
                        type="button"
                        onClick={() => void handleToggle(todo)}
                        className="mt-1 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-[#9fb5cd] text-[#2f5f95] transition hover:bg-[#eaf2fc]"
                        aria-label={`Mark ${todo.title} complete`}
                      >
                        ✓
                      </button>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-[#17355f]">{todo.title}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                          <span className="rounded-full bg-[#edf3fa] px-2 py-0.5 text-[#4e6785]">
                            Due: {formatDate(todo.dueAt)}
                          </span>
                          <span className="rounded-full bg-[#eaf4ff] px-2 py-0.5 text-[#215792]">
                            {CATEGORY_LABEL[todo.category]}
                          </span>
                          <span className="rounded-full bg-[#f4ecff] px-2 py-0.5 text-[#61408c]">
                            Priority: {PRIORITY_LABEL[todo.priority]}
                          </span>
                          {status === "warning" && (
                            <span className="badge-status-warning rounded-full px-2 py-0.5">Warning</span>
                          )}
                          {status === "danger" && (
                            <span className="badge-status-danger rounded-full px-2 py-0.5">Overdue</span>
                          )}
                        </div>
                        {todo.memo && (
                          <p className="mt-2 line-clamp-2 text-xs text-[#35557c]">{todo.memo}</p>
                        )}
                      </div>

                      <div className="flex shrink-0 gap-1">
                        <button
                          type="button"
                          onClick={() => openEdit(todo)}
                          className="rounded-lg border border-[#c9d7e7] px-2 py-1 text-xs text-[#2d4f7d] hover:bg-[#edf5ff]"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDelete(todo)}
                          className="rounded-lg border border-[#f1c7cd] px-2 py-1 text-xs text-[#a2202d] hover:bg-[#fff0f3]"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="mt-5 glass-card rounded-3xl p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[#12325a]">Completed Tasks</h2>
            <Link
              href="/history"
              className="rounded-lg border border-[#c6d8ee] bg-[#edf5ff] px-3 py-1 text-xs font-semibold text-[#134b99] hover:brightness-95"
            >
              Open history
            </Link>
          </div>
          {completedTodos.length === 0 ? (
            <p className="py-6 text-sm text-muted">No completed tasks.</p>
          ) : (
            <ul className="space-y-3">
              {completedTodos.map((todo) => (
                <li key={todo.id} className="rounded-2xl border border-[#d0e8df] bg-[#f5fffa] p-3">
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      onClick={() => void handleToggle(todo)}
                      className="mt-1 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-[#8cd7be] bg-[#16a078] text-white"
                      aria-label={`Mark ${todo.title} pending`}
                    >
                      ✓
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-[#4a6a60] line-through">{todo.title}</p>
                      <p className="mt-1 text-xs text-[#5f7f74]">
                        Completed: {formatDate(todo.completedAt ?? todo.updatedAt)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleDelete(todo)}
                      className="rounded-lg border border-[#f1c7cd] px-2 py-1 text-xs text-[#a2202d] hover:bg-[#fff0f3]"
                    >
                      Delete
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
          <div className="glass-card w-full max-w-xl rounded-2xl p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-[#17355f]">Edit task</h3>
              <button
                type="button"
                onClick={closeEdit}
                className="rounded-lg border border-[#cfdbeb] px-2 py-1 text-xs text-[#47658a] hover:bg-[#edf5ff]"
              >
                Close
              </button>
            </div>
            <form onSubmit={handleEdit} className="space-y-3">
              <label className="block text-sm text-muted" htmlFor="editTitle">
                Title
              </label>
              <input
                id="editTitle"
                value={editTitle}
                onChange={(event) => setEditTitle(event.target.value)}
                className="w-full rounded-xl border border-[#c9d8ea] bg-white px-3 py-2 text-sm outline-none ring-primary/20 focus:ring-4"
              />

              <label className="block text-sm text-muted" htmlFor="editDueAt">
                Due date
              </label>
              <input
                id="editDueAt"
                type="date"
                value={editDueDate}
                onChange={(event) => setEditDueDate(event.target.value)}
                className="w-full rounded-xl border border-[#c9d8ea] bg-white px-3 py-2 text-sm outline-none ring-primary/20 focus:ring-4"
              />

              <label className="block text-sm text-muted" htmlFor="editMemo">
                Memo
              </label>
              <textarea
                id="editMemo"
                value={editMemo}
                onChange={(event) => setEditMemo(event.target.value)}
                rows={3}
                className="w-full rounded-xl border border-[#c9d8ea] bg-white px-3 py-2 text-sm outline-none ring-primary/20 focus:ring-4"
              />

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-sm text-muted" htmlFor="editCategory">
                    Category
                  </label>
                  <select
                    id="editCategory"
                    value={editCategory}
                    onChange={(event) => setEditCategory(event.target.value as TodoCategory)}
                    className="w-full rounded-xl border border-[#c9d8ea] bg-white px-3 py-2 text-sm outline-none ring-primary/20 focus:ring-4"
                  >
                    {Object.entries(CATEGORY_LABEL).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-muted" htmlFor="editPriority">
                    Priority
                  </label>
                  <select
                    id="editPriority"
                    value={editPriority}
                    onChange={(event) => setEditPriority(event.target.value as TodoPriority)}
                    className="w-full rounded-xl border border-[#c9d8ea] bg-white px-3 py-2 text-sm outline-none ring-primary/20 focus:ring-4"
                  >
                    {Object.entries(PRIORITY_LABEL).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeEdit}
                  className="rounded-xl border border-[#cfdbeb] px-4 py-2 text-sm text-[#47658a] hover:bg-[#edf5ff]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSaving}
                  className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {editSaving ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
