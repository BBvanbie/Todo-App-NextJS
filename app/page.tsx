"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { CompletedTodosSection } from "./_components/todos/CompletedTodosSection";
import { CompletionToast } from "./_components/todos/CompletionToast";
import { DuplicateTodoModal } from "./_components/todos/DuplicateTodoModal";
import { EditHistoryModal } from "./_components/todos/EditHistoryModal";
import { EditTodoModal } from "./_components/todos/EditTodoModal";
import { NotificationPanel } from "./_components/todos/NotificationPanel";
import { PendingTodosSection } from "./_components/todos/PendingTodosSection";
import {
  matchesDueFilter,
  toDateInputValue,
  toJstMidnightIso,
  type AppNotification,
  type DueFilter,
  type SelectableCategory,
  type SelectablePriority,
  type Todo,
  type TodoCategory,
  type TodoEditHistory,
  type TodoPriority,
} from "./_components/todos/model";

async function getApiErrorMessage(response: Response, fallback: string) {
  try {
    const body = (await response.json()) as { message?: string };
    return body.message ?? fallback;
  } catch {
    return fallback;
  }
}

export default function Home() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<SelectableCategory>("ALL");
  const [filterPriority, setFilterPriority] = useState<SelectablePriority>("ALL");
  const [filterDue, setFilterDue] = useState<DueFilter>("ALL");

  const [editing, setEditing] = useState<Todo | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editMemo, setEditMemo] = useState("");
  const [editCategory, setEditCategory] = useState<TodoCategory>("OTHER");
  const [editPriority, setEditPriority] = useState<TodoPriority>("MEDIUM");
  const [editDueDate, setEditDueDate] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  const [toastTodo, setToastTodo] = useState<Todo | null>(null);
  const [showToast, setShowToast] = useState(false);
  const toastTimerRef = useRef<number | null>(null);

  const [dupSource, setDupSource] = useState<Todo | null>(null);
  const [dupTitle, setDupTitle] = useState("");
  const [dupMemo, setDupMemo] = useState("");
  const [dupCategory, setDupCategory] = useState<TodoCategory>("OTHER");
  const [dupPriority, setDupPriority] = useState<TodoPriority>("MEDIUM");
  const [dupDueDate, setDupDueDate] = useState("");
  const [dupSaving, setDupSaving] = useState(false);

  const [historyTodo, setHistoryTodo] = useState<Todo | null>(null);
  const [editHistories, setEditHistories] = useState<TodoEditHistory[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      setError(null);
      try {
        const [todoRes, notifRes] = await Promise.all([
          fetch("/api/todos", { cache: "no-store" }),
          fetch("/api/notifications", { cache: "no-store" }),
        ]);
        if (!todoRes.ok) {
          throw new Error(await getApiErrorMessage(todoRes, "データ取得に失敗しました。"));
        }
        setTodos((await todoRes.json()) as Todo[]);
        if (notifRes.ok) setNotifications((await notifRes.json()) as AppNotification[]);
      } catch (e) {
        setError(e instanceof Error ? e.message : "データ取得に失敗しました。");
      } finally {
        setLoading(false);
      }
    };

    void fetchAll();

    return () => {
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    };
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return todos.filter((todo) => {
      const queryOk = q.length === 0 || `${todo.title} ${todo.memo ?? ""}`.toLowerCase().includes(q);
      const categoryOk = filterCategory === "ALL" || todo.category === filterCategory;
      const priorityOk = filterPriority === "ALL" || todo.priority === filterPriority;
      const dueOk = matchesDueFilter(todo, filterDue);
      return queryOk && categoryOk && priorityOk && dueOk;
    });
  }, [todos, search, filterCategory, filterPriority, filterDue]);

  const pendingTodos = useMemo(
    () => filtered.filter((todo) => !todo.completed).sort((a, b) => +new Date(a.dueAt) - +new Date(b.dueAt)),
    [filtered],
  );
  const completedTodos = useMemo(
    () => filtered.filter((todo) => todo.completed).sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt)),
    [filtered],
  );
  const unreadCount = notifications.filter((notification) => !notification.readAt).length;

  const openToast = (todo: Todo) => {
    setToastTodo(todo);
    setShowToast(true);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => {
      setShowToast(false);
      setToastTodo(null);
    }, 3500);
  };

  const closeToast = () => {
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    setShowToast(false);
    setToastTodo(null);
  };

  const openDuplicateFromToast = () => {
    if (!toastTodo) return;
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    setDupSource(toastTodo);
    setDupTitle(toastTodo.title);
    setDupMemo(toastTodo.memo ?? "");
    setDupCategory(toastTodo.category);
    setDupPriority(toastTodo.priority);
    setDupDueDate("");
    setShowToast(false);
    setToastTodo(null);
  };

  const openEditHistory = async (todo: Todo) => {
    setHistoryTodo(todo);
    setEditHistories([]);
    setHistoryLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/todos/${todo.id}/edits`, { cache: "no-store" });
      if (!res.ok) {
        throw new Error(await getApiErrorMessage(res, "編集履歴の取得に失敗しました。"));
      }
      setEditHistories((await res.json()) as TodoEditHistory[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "編集履歴の取得に失敗しました。");
    } finally {
      setHistoryLoading(false);
    }
  };

  const closeEditHistory = () => {
    setHistoryTodo(null);
    setEditHistories([]);
    setHistoryLoading(false);
  };

  const handleToggle = async (todo: Todo) => {
    const nextCompleted = !todo.completed;
    const previous = todo;

    setTodos((list) =>
      list.map((item) =>
        item.id === todo.id
          ? {
              ...item,
              completed: nextCompleted,
              completedAt: nextCompleted ? new Date().toISOString() : null,
              updatedAt: new Date().toISOString(),
            }
          : item,
      ),
    );

    if (nextCompleted) openToast(todo);

    try {
      const res = await fetch(`/api/todos/${todo.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: nextCompleted }),
      });
      if (!res.ok) throw new Error(await getApiErrorMessage(res, "更新に失敗しました。"));
      const saved = (await res.json()) as Todo;
      setTodos((list) => list.map((item) => (item.id === saved.id ? saved : item)));
    } catch (e) {
      setTodos((list) => list.map((item) => (item.id === previous.id ? previous : item)));
      if (nextCompleted) closeToast();
      setError(e instanceof Error ? e.message : "更新に失敗しました。");
    }
  };

  const handleDelete = async (todo: Todo) => {
    if (!window.confirm(`「${todo.title}」を削除しますか？`)) return;
    const snapshot = todos;
    setTodos((list) => list.filter((item) => item.id !== todo.id));
    try {
      const res = await fetch(`/api/todos/${todo.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await getApiErrorMessage(res, "削除に失敗しました。"));
    } catch (e) {
      setTodos(snapshot);
      setError(e instanceof Error ? e.message : "削除に失敗しました。");
    }
  };

  const markRead = async (id: number) => {
    const snapshot = notifications;
    setNotifications((list) =>
      list.map((item) =>
        item.id === id ? { ...item, readAt: item.readAt ?? new Date().toISOString() } : item,
      ),
    );
    try {
      const res = await fetch(`/api/notifications/${id}/read`, { method: "PATCH" });
      if (!res.ok) throw new Error("failed");
    } catch {
      setNotifications(snapshot);
    }
  };

  const markAllRead = async () => {
    const snapshot = notifications;
    const now = new Date().toISOString();
    setNotifications((list) => list.map((item) => ({ ...item, readAt: item.readAt ?? now })));
    try {
      const res = await fetch("/api/notifications/read-all", { method: "PATCH" });
      if (!res.ok) throw new Error("failed");
    } catch {
      setNotifications(snapshot);
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

  const submitEdit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editing) return;
    if (!editTitle.trim()) return setError("件名は必須です。");
    if (!editDueDate) return setError("日付は必須です。");
    setEditSaving(true);
    try {
      const res = await fetch(`/api/todos/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editTitle.trim(),
          memo: editMemo.trim() || null,
          category: editCategory,
          priority: editPriority,
          dueAt: toJstMidnightIso(editDueDate),
        }),
      });
      if (!res.ok) throw new Error(await getApiErrorMessage(res, "編集に失敗しました。"));
      const saved = (await res.json()) as Todo;
      setTodos((list) => list.map((item) => (item.id === saved.id ? saved : item)));
      closeEdit();
    } catch (e) {
      setEditSaving(false);
      setError(e instanceof Error ? e.message : "編集に失敗しました。");
    }
  };

  const closeDuplicate = () => {
    setDupSource(null);
    setDupTitle("");
    setDupMemo("");
    setDupCategory("OTHER");
    setDupPriority("MEDIUM");
    setDupDueDate("");
    setDupSaving(false);
  };

  const submitDuplicate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!dupSource) return;
    if (!dupTitle.trim()) return setError("件名は必須です。");
    if (!dupDueDate) return setError("日付は必須です。");
    setDupSaving(true);
    try {
      const res = await fetch(`/api/todos/${dupSource.id}/duplicate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dueDate: dupDueDate,
          title: dupTitle.trim(),
          memo: dupMemo.trim() || null,
          category: dupCategory,
          priority: dupPriority,
        }),
      });
      if (!res.ok) throw new Error(await getApiErrorMessage(res, "次回分作成に失敗しました。"));
      const created = (await res.json()) as Todo;
      setTodos((list) => [created, ...list]);
      closeDuplicate();
    } catch (e) {
      setDupSaving(false);
      setError(e instanceof Error ? e.message : "次回分作成に失敗しました。");
    }
  };

  return (
    <div className="relative min-h-screen">
      <div className="soft-grid pointer-events-none fixed inset-0 z-0" />

      {showToast && toastTodo && (
        <CompletionToast
          todo={toastTodo}
          onClose={closeToast}
          onCreateNext={openDuplicateFromToast}
        />
      )}

      <main className="relative z-10 mx-auto w-full max-w-6xl px-4 py-6 md:px-8 md:py-10">
        <section className="glass-card rounded-3xl p-6 md:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#2f5f95]">
                タスクレーダー
              </p>
              <h1 className="mt-1 text-3xl font-bold tracking-tight text-[#0f1f35]">
                Todoダッシュボード
              </h1>
              <p className="mt-2 text-sm text-muted">
                期限7日以内は注意、期限切れは警告で表示します。
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setNotificationOpen((prev) => !prev)}
                className="rounded-xl border border-[#c8d8ea] bg-white px-3 py-2 text-sm"
              >
                通知
                {unreadCount > 0 && (
                  <span className="ml-2 rounded-full bg-[#d62246] px-2 py-0.5 text-xs text-white">
                    {unreadCount}
                  </span>
                )}
              </button>
              <Link
                href="/tasks/new"
                className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white"
              >
                新規作成
              </Link>
            </div>
          </div>

          {notificationOpen && (
            <NotificationPanel
              notifications={notifications}
              onMarkRead={(id) => void markRead(id)}
              onMarkAllRead={() => void markAllRead()}
            />
          )}
        </section>

        <PendingTodosSection
          loading={loading}
          todos={pendingTodos}
          search={search}
          filterCategory={filterCategory}
          filterPriority={filterPriority}
          filterDue={filterDue}
          onSearchChange={setSearch}
          onFilterCategoryChange={setFilterCategory}
          onFilterPriorityChange={setFilterPriority}
          onFilterDueChange={setFilterDue}
          onToggle={(todo) => void handleToggle(todo)}
          onEdit={openEdit}
          onOpenEditHistory={(todo) => void openEditHistory(todo)}
          onDelete={(todo) => void handleDelete(todo)}
        />

        <CompletedTodosSection
          todos={completedTodos}
          onToggle={(todo) => void handleToggle(todo)}
          onDelete={(todo) => void handleDelete(todo)}
        />

        {error && (
          <p className="mt-4 rounded-xl border border-[#ffd4dc] bg-[#fff4f6] px-4 py-3 text-sm text-[#a31f2b]">
            {error}
          </p>
        )}
      </main>

      {dupSource && (
        <DuplicateTodoModal
          source={dupSource}
          title={dupTitle}
          memo={dupMemo}
          dueDate={dupDueDate}
          category={dupCategory}
          priority={dupPriority}
          saving={dupSaving}
          onTitleChange={setDupTitle}
          onMemoChange={setDupMemo}
          onDueDateChange={setDupDueDate}
          onCategoryChange={setDupCategory}
          onPriorityChange={setDupPriority}
          onClose={closeDuplicate}
          onSubmit={submitDuplicate}
        />
      )}

      {editing && (
        <EditTodoModal
          title={editTitle}
          memo={editMemo}
          dueDate={editDueDate}
          category={editCategory}
          priority={editPriority}
          saving={editSaving}
          onTitleChange={setEditTitle}
          onMemoChange={setEditMemo}
          onDueDateChange={setEditDueDate}
          onCategoryChange={setEditCategory}
          onPriorityChange={setEditPriority}
          onClose={closeEdit}
          onSubmit={submitEdit}
        />
      )}

      {historyTodo && (
        <EditHistoryModal
          todo={historyTodo}
          histories={editHistories}
          loading={historyLoading}
          onClose={closeEditHistory}
        />
      )}
    </div>
  );
}

