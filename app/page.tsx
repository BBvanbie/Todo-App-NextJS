"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
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

function getTokyoYmd(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
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
  const [isAdmin, setIsAdmin] = useState(false);
  const [kpiOpen, setKpiOpen] = useState(false);

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

  useEffect(() => {
    let cancelled = false;

    const fetchSession = async () => {
      try {
        const res = await fetch("/api/auth/session", { cache: "no-store" });
        if (!res.ok) return;
        const body = (await res.json()) as { user?: { role?: string } };
        if (!cancelled) {
          setIsAdmin(body.user?.role === "ADMIN");
        }
      } catch {
        if (!cancelled) setIsAdmin(false);
      }
    };

    void fetchSession();
    return () => {
      cancelled = true;
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
  const dashboardStats = useMemo(() => {
    const today = getTokyoYmd(new Date());
    const in7Days = getTokyoYmd(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
    const overdue = todos.filter((todo) => !todo.completed && getTokyoYmd(todo.dueAt) < today).length;
    const dueSoon = todos.filter((todo) => {
      if (todo.completed) return false;
      const due = getTokyoYmd(todo.dueAt);
      return due >= today && due <= in7Days;
    }).length;

    return {
      total: todos.length,
      pending: todos.filter((todo) => !todo.completed).length,
      completed: todos.filter((todo) => todo.completed).length,
      dueSoon,
      overdue,
    };
  }, [todos]);

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
    <div className="relative min-h-screen overflow-hidden">
      <div className="soft-grid pointer-events-none fixed inset-0 z-0" />
      <div className="pointer-events-none fixed -left-20 -top-10 z-0 h-72 w-72 rounded-full bg-[radial-gradient(circle,#8ec8ff_0%,#8ec8ff00_68%)]" />
      <div className="pointer-events-none fixed -right-14 top-10 z-0 h-80 w-80 rounded-full bg-[radial-gradient(circle,#b5ffe3_0%,#b5ffe300_70%)]" />
      <div className="pointer-events-none fixed bottom-6 left-1/2 z-0 h-64 w-64 -translate-x-1/2 rounded-full bg-[radial-gradient(circle,#f7ddff_0%,#f7ddff00_72%)]" />

      {showToast && toastTodo && (
        <CompletionToast
          todo={toastTodo}
          onClose={closeToast}
          onCreateNext={openDuplicateFromToast}
        />
      )}

      <main className="relative z-10 mx-auto w-full max-w-6xl px-4 py-6 pb-28 md:px-8 md:py-10 md:pb-12">
        <section className="relative flex h-[clamp(72px,10vh,96px)] items-center overflow-hidden rounded-[22px] border border-[#bfdbf5] bg-[linear-gradient(128deg,#102f57_0%,#174786_55%,#2e66a4_100%)] px-3 text-white shadow-[0_18px_50px_-34px_#103058] sm:px-4 md:rounded-[24px] md:px-5">
          <div className="pointer-events-none absolute -right-10 -top-10 hidden h-24 w-24 rounded-full border border-white/20 sm:block" />
          <div className="pointer-events-none absolute right-20 top-2 hidden h-10 w-10 rounded-full border border-white/20 sm:block" />
          <div className="pointer-events-none absolute -bottom-14 left-10 hidden h-24 w-24 rounded-full bg-[radial-gradient(circle,#9ec8ff44_0%,#9ec8ff00_70%)] sm:block" />
          <div className="min-w-0 pr-24 sm:pr-44">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#c3ddff] sm:text-[11px]">Task Radar</p>
            <h1 className="mt-1 truncate text-[clamp(14px,2.2vw,20px)] font-bold tracking-tight">Todoコントロールセンター</h1>
          </div>

          <div className="absolute right-3 top-3 flex items-center gap-2 sm:right-4 sm:top-4">
            {isAdmin && (
              <Link
                href="/admin"
                className="rounded-lg border border-white/35 bg-white/10 px-2 py-1 text-[11px] font-semibold text-white backdrop-blur sm:px-2.5 sm:py-1.5 sm:text-xs"
              >
                管理者
              </Link>
            )}
            <button
              type="button"
              onClick={() => void signOut({ callbackUrl: "/login" })}
              className="rounded-lg border border-white/35 bg-white/10 px-2 py-1 text-[11px] font-semibold text-white backdrop-blur sm:px-2.5 sm:py-1.5 sm:text-xs"
            >
              ログアウト
            </button>
          </div>
        </section>

        <section className="mt-4 md:mt-6">
          <div className="md:hidden">
            <button
              type="button"
              onClick={() => setKpiOpen((prev) => !prev)}
              className="glass-card flex w-full items-center justify-between rounded-2xl border border-[#d3e2f3] bg-white/92 px-4 py-3"
              aria-expanded={kpiOpen}
              aria-controls="kpi-mobile-panel"
            >
              <div className="text-left">
                <p className="text-[11px] text-[#5d7898]">KPIサマリー</p>
                <p className="text-sm font-semibold text-[#14355d]">総タスク {dashboardStats.total} 件</p>
              </div>
              <span className="text-sm text-[#1e4f86]">{kpiOpen ? "閉じる" : "開く"}</span>
            </button>

            <div
              id="kpi-mobile-panel"
              className={`overflow-hidden transition-all duration-300 ${kpiOpen ? "mt-2 max-h-96" : "max-h-0"}`}
            >
              <div className="grid grid-cols-2 gap-2">
                <article className="glass-card rounded-xl border border-[#d3e2f3] bg-white/90 p-2.5">
                  <p className="text-[10px] text-[#59799e]">総タスク</p>
                  <p className="mt-1 text-xl font-bold leading-none text-[#14355d]">{dashboardStats.total}</p>
                </article>
                <article className="glass-card rounded-xl border border-[#d3e2f3] bg-white/90 p-2.5">
                  <p className="text-[10px] text-[#59799e]">未完了</p>
                  <p className="mt-1 text-xl font-bold leading-none text-[#14355d]">{dashboardStats.pending}</p>
                </article>
                <article className="glass-card rounded-xl border border-[#d3e2f3] bg-white/90 p-2.5">
                  <p className="text-[10px] text-[#59799e]">完了</p>
                  <p className="mt-1 text-xl font-bold leading-none text-[#14355d]">{dashboardStats.completed}</p>
                </article>
                <article className="glass-card rounded-xl border border-[#d3e2f3] bg-white/90 p-2.5">
                  <p className="text-[10px] text-[#59799e]">7日以内</p>
                  <p className="mt-1 text-xl font-bold leading-none text-[#14355d]">{dashboardStats.dueSoon}</p>
                </article>
                <article className="glass-card col-span-2 rounded-xl border border-[#f0d3d8] bg-[#fff8f9] p-2.5">
                  <p className="text-[10px] text-[#916173]">期限切れ</p>
                  <p className="mt-1 text-xl font-bold leading-none text-[#a23247]">{dashboardStats.overdue}</p>
                </article>
              </div>
            </div>
          </div>

          <div className="hidden gap-2.5 md:flex">
            <article className="glass-card min-w-[112px] flex-1 rounded-2xl border border-[#d3e2f3] bg-white/90 p-3 lg:p-4">
              <p className="text-[11px] text-[#59799e]">総タスク</p>
              <p className="mt-1 text-[clamp(22px,2.2vw,30px)] font-bold leading-none text-[#14355d]">{dashboardStats.total}</p>
            </article>
            <article className="glass-card min-w-[112px] flex-1 rounded-2xl border border-[#d3e2f3] bg-white/90 p-3 lg:p-4">
              <p className="text-[11px] text-[#59799e]">未完了</p>
              <p className="mt-1 text-[clamp(22px,2.2vw,30px)] font-bold leading-none text-[#14355d]">{dashboardStats.pending}</p>
            </article>
            <article className="glass-card min-w-[112px] flex-1 rounded-2xl border border-[#d3e2f3] bg-white/90 p-3 lg:p-4">
              <p className="text-[11px] text-[#59799e]">完了</p>
              <p className="mt-1 text-[clamp(22px,2.2vw,30px)] font-bold leading-none text-[#14355d]">{dashboardStats.completed}</p>
            </article>
            <article className="glass-card min-w-[112px] flex-1 rounded-2xl border border-[#d3e2f3] bg-white/90 p-3 lg:p-4">
              <p className="text-[11px] text-[#59799e]">7日以内</p>
              <p className="mt-1 text-[clamp(22px,2.2vw,30px)] font-bold leading-none text-[#14355d]">{dashboardStats.dueSoon}</p>
            </article>
            <article className="glass-card min-w-[112px] flex-1 rounded-2xl border border-[#f0d3d8] bg-[#fff8f9] p-3 lg:p-4">
              <p className="text-[11px] text-[#916173]">期限切れ</p>
              <p className="mt-1 text-[clamp(22px,2.2vw,30px)] font-bold leading-none text-[#a23247]">{dashboardStats.overdue}</p>
            </article>
          </div>
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

      {notificationOpen && (
        <div className="fixed inset-x-4 bottom-24 z-30 md:inset-x-auto md:right-8 md:w-[420px]">
          <NotificationPanel
            notifications={notifications}
            onMarkRead={(id) => void markRead(id)}
            onMarkAllRead={() => void markAllRead()}
          />
        </div>
      )}

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[#d1dfef] bg-white/88 px-4 py-2.5 backdrop-blur supports-[padding:max(0px)]:pb-[max(0.625rem,env(safe-area-inset-bottom))] md:hidden">
        <div className="mx-auto flex w-full max-w-md items-center justify-between">
          <button
            type="button"
            onClick={() => setNotificationOpen((prev) => !prev)}
            className="relative inline-flex h-12 w-12 items-center justify-center rounded-full border border-[#bfd3ea] bg-[#eef5ff] text-xl text-[#1f4f86]"
            aria-label="通知を表示"
          >
            <span aria-hidden>🔔</span>
            {unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full bg-[#d62246] px-1.5 py-0.5 text-[10px] font-bold text-white">
                {unreadCount}
              </span>
            )}
          </button>

          <Link
            href="/tasks/new"
            className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#1d5da8] text-2xl font-bold text-white shadow-[0_12px_30px_-18px_#12355d]"
            aria-label="新規作成"
          >
            +
          </Link>
        </div>
      </div>

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

