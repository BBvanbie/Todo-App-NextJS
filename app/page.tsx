"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

type TodoCategory = "WORK" | "PRIVATE" | "PROCEDURE" | "STUDY" | "HEALTH" | "SHOPPING" | "OTHER";
type TodoPriority = "HIGH" | "MEDIUM" | "LOW";
type DueFilter = "ALL" | "TODAY" | "IN_7_DAYS" | "OVERDUE";
type SelectableCategory = "ALL" | TodoCategory;
type SelectablePriority = "ALL" | TodoPriority;

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

type AppNotification = {
  id: number;
  message: string;
  createdAt: string;
  readAt: string | null;
  todo: { id: number; title: string; dueAt: string; completed: boolean };
};

type TodoEditHistory = {
  id: number;
  editedAt: string;
};

const CATEGORY_LABEL: Record<TodoCategory, string> = {
  WORK: "仕事",
  PRIVATE: "プライベート",
  PROCEDURE: "手続き",
  STUDY: "勉強",
  HEALTH: "健康",
  SHOPPING: "買い物",
  OTHER: "その他",
};

const PRIORITY_LABEL: Record<TodoPriority, string> = {
  HIGH: "高",
  MEDIUM: "中",
  LOW: "低",
};

const DUE_FILTER_LABEL: Record<DueFilter, string> = {
  ALL: "すべて",
  TODAY: "今日",
  IN_7_DAYS: "7日以内",
  OVERDUE: "期限切れ",
};

function formatDate(isoString: string) {
  return new Intl.DateTimeFormat("ja-JP", { year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(isoString));
}

function formatDateTime(isoString: string) {
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(isoString));
}

function toDateInputValue(isoString: string) {
  const d = new Date(isoString);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function toJstMidnightIso(dateInput: string) {
  return new Date(`${dateInput}T00:00:00+09:00`).toISOString();
}

function getTokyoYmd(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((p) => p.type === "year")?.value ?? "1970";
  const month = parts.find((p) => p.type === "month")?.value ?? "01";
  const day = parts.find((p) => p.type === "day")?.value ?? "01";
  return `${year}-${month}-${day}`;
}

function getTokyoYmdWithOffset(days: number) {
  const target = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  return getTokyoYmd(target);
}

function getDueStatus(isoString: string): "ok" | "warning" | "danger" {
  const dueKey = getTokyoYmd(isoString);
  const todayKey = getTokyoYmdWithOffset(0);
  const in7Key = getTokyoYmdWithOffset(7);
  if (dueKey < todayKey) return "danger";
  if (dueKey <= in7Key) return "warning";
  return "ok";
}

function matchesDueFilter(todo: Todo, filter: DueFilter) {
  if (filter === "ALL") return true;
  const dueKey = getTokyoYmd(todo.dueAt);
  const todayKey = getTokyoYmdWithOffset(0);
  const in7Key = getTokyoYmdWithOffset(7);
  if (filter === "TODAY") return dueKey === todayKey;
  if (filter === "IN_7_DAYS") return dueKey >= todayKey && dueKey <= in7Key;
  return dueKey < todayKey;
}

function getCardTone(status: "ok" | "warning" | "danger") {
  if (status === "danger") return "border-[#f1a6ae] bg-[#ffeef0]";
  if (status === "warning") return "border-[#ffd18f] bg-[#fff6e9]";
  return "border-[#d7e1ee] bg-white/90";
}

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
        if (!todoRes.ok) throw new Error(await getApiErrorMessage(todoRes, "データ取得に失敗しました。"));
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

  const pendingTodos = useMemo(() => filtered.filter((todo) => !todo.completed).sort((a, b) => +new Date(a.dueAt) - +new Date(b.dueAt)), [filtered]);
  const completedTodos = useMemo(() => filtered.filter((todo) => todo.completed).sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt)), [filtered]);
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
      if (!res.ok) throw new Error(await getApiErrorMessage(res, "編集履歴の取得に失敗しました。"));
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
          ? { ...item, completed: nextCompleted, completedAt: nextCompleted ? new Date().toISOString() : null, updatedAt: new Date().toISOString() }
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
    setNotifications((list) => list.map((item) => (item.id === id ? { ...item, readAt: item.readAt ?? new Date().toISOString() } : item)));
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
        <div className="congrats-enter fixed top-4 left-1/2 z-50 w-[min(92vw,420px)] -translate-x-1/2 rounded-2xl border border-[#8bd8b4] bg-[#e8fff2] px-5 py-5 text-center shadow-lg">
          <button type="button" onClick={closeToast} className="absolute top-3 right-3 rounded-md border border-[#b8e6d0] px-2 py-1 text-xs" aria-label="閉じる">×</button>
          <p className="text-lg font-bold text-[#0a6f4f]">完了！🎉</p>
          <p className="mt-1 text-sm text-[#1f7f61]">次回分も作成しますか？</p>
          <button type="button" onClick={openDuplicateFromToast} className="mx-auto mt-3 inline-flex rounded-xl bg-[#15a272] px-4 py-2 text-sm font-semibold text-white">次回分を作成</button>
        </div>
      )}

      <main className="relative z-10 mx-auto w-full max-w-6xl px-4 py-6 md:px-8 md:py-10">
        <section className="glass-card rounded-3xl p-6 md:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#2f5f95]">タスクレーダー</p>
              <h1 className="mt-1 text-3xl font-bold tracking-tight text-[#0f1f35]">Todoダッシュボード</h1>
              <p className="mt-2 text-sm text-muted">期限7日以内は注意、期限切れは警告で表示します。</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button type="button" onClick={() => setNotificationOpen((prev) => !prev)} className="rounded-xl border border-[#c8d8ea] bg-white px-3 py-2 text-sm">通知{unreadCount > 0 && <span className="ml-2 rounded-full bg-[#d62246] px-2 py-0.5 text-xs text-white">{unreadCount}</span>}</button>
              <Link href="/tasks/new" className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white">新規作成</Link>
            </div>
          </div>

          {notificationOpen && (
            <div className="mt-4 rounded-2xl border border-[#cedded] bg-white/95 p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-[#17355f]">通知一覧</h3>
                <button type="button" onClick={() => void markAllRead()} className="rounded-lg border border-[#c9d7e7] px-2 py-1 text-xs">すべて既読</button>
              </div>
              {notifications.length === 0 ? (
                <p className="text-xs text-muted">通知はありません。</p>
              ) : (
                <ul className="space-y-2">
                  {notifications.map((notification) => (
                    <li key={notification.id} className={`rounded-xl border px-3 py-2 ${notification.readAt ? "border-[#dde7f3] bg-[#f8fbff]" : "border-[#ffd2d9] bg-[#fff4f6]"}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm text-[#17355f]">{notification.message}</p>
                          <p className="mt-1 text-xs text-[#5c7392]">作成: {formatDate(notification.createdAt)} / 期限: {formatDate(notification.todo.dueAt)}</p>
                        </div>
                        {!notification.readAt && <button type="button" onClick={() => void markRead(notification.id)} className="rounded-lg border border-[#c9d7e7] px-2 py-1 text-xs">既読</button>}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </section>

        <section className="mt-5 glass-card rounded-3xl p-5">
          <div className="mb-3 grid gap-2 sm:grid-cols-2 md:grid-cols-4">
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="件名・メモで検索" className="rounded-xl border border-[#c9d8ea] bg-white px-3 py-2 text-sm" />
            <select value={filterCategory} onChange={(event) => setFilterCategory(event.target.value as SelectableCategory)} className="rounded-xl border border-[#c9d8ea] bg-white px-3 py-2 text-sm">
              <option value="ALL">カテゴリ: すべて</option>
              {Object.entries(CATEGORY_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <select value={filterPriority} onChange={(event) => setFilterPriority(event.target.value as SelectablePriority)} className="rounded-xl border border-[#c9d8ea] bg-white px-3 py-2 text-sm">
              <option value="ALL">重要度: すべて</option>
              {Object.entries(PRIORITY_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <select value={filterDue} onChange={(event) => setFilterDue(event.target.value as DueFilter)} className="rounded-xl border border-[#c9d8ea] bg-white px-3 py-2 text-sm">
              {Object.entries(DUE_FILTER_LABEL).map(([value, label]) => <option key={value} value={value}>期限: {label}</option>)}
            </select>
          </div>

          {loading ? (
            <p className="py-8 text-sm text-muted">読み込み中...</p>
          ) : pendingTodos.length === 0 ? (
            <p className="py-8 text-sm text-muted">未完了タスクはありません。</p>
          ) : (
            <ul className="space-y-3">
              {pendingTodos.map((todo) => {
                const status = getDueStatus(todo.dueAt);
                return (
                  <li key={todo.id} className={`rounded-2xl border p-3 shadow-[0_8px_20px_-20px_#0d315f] ${getCardTone(status)}`}>
                    <div className="flex items-start gap-3">
                      <button type="button" onClick={() => void handleToggle(todo)} className="mt-1 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-[#9fb5cd]" aria-label={`「${todo.title}」を完了にする`}>□</button>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-[#17355f]">{todo.title}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                          <span className="rounded-full bg-[#edf3fa] px-2 py-0.5 text-[#4e6785]">期限: {formatDate(todo.dueAt)}</span>
                          <span className="rounded-full bg-[#eaf4ff] px-2 py-0.5 text-[#215792]">{CATEGORY_LABEL[todo.category]}</span>
                          <span className="rounded-full bg-[#f4ecff] px-2 py-0.5 text-[#61408c]">重要度: {PRIORITY_LABEL[todo.priority]}</span>
                          {status === "warning" && <span className="badge-status-warning rounded-full px-2 py-0.5">注意: 期限まで7日以内</span>}
                          {status === "danger" && <span className="badge-status-danger rounded-full px-2 py-0.5">警告: 期限切れ</span>}
                        </div>
                        {todo.memo && <p className="mt-2 line-clamp-2 text-xs text-[#35557c]">{todo.memo}</p>}
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <button type="button" onClick={() => openEdit(todo)} className="rounded-lg border border-[#c9d7e7] px-2 py-1 text-xs">編集</button>
                        <button type="button" onClick={() => void openEditHistory(todo)} className="rounded-lg border border-[#c9d7e7] px-2 py-1 text-xs">編集履歴</button>
                        <button type="button" onClick={() => void handleDelete(todo)} className="rounded-lg border border-[#f1c7cd] px-2 py-1 text-xs">削除</button>
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
            <h2 className="text-lg font-semibold text-[#12325a]">完了タスク</h2>
            <Link href="/history" className="rounded-lg border border-[#c6d8ee] bg-[#edf5ff] px-3 py-1 text-xs font-semibold text-[#134b99]">履歴を見る</Link>
          </div>
          {completedTodos.length === 0 ? (
            <p className="py-6 text-sm text-muted">完了タスクはありません。</p>
          ) : (
            <ul className="space-y-3">
              {completedTodos.map((todo) => (
                <li key={todo.id} className="rounded-2xl border border-[#d0e8df] bg-[#f5fffa] p-3">
                  <div className="flex items-start gap-3">
                    <button type="button" onClick={() => void handleToggle(todo)} className="mt-1 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-[#8cd7be] bg-[#16a078] text-white" aria-label={`「${todo.title}」を未完了に戻す`}>✓</button>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-[#4a6a60] line-through">{todo.title}</p>
                      <p className="mt-1 text-xs text-[#5f7f74]">期限: {formatDate(todo.dueAt)}</p>
                      <p className="mt-1 text-xs text-[#5f7f74]">完了日: {formatDate(todo.completedAt ?? todo.updatedAt)}</p>
                    </div>
                    <button type="button" onClick={() => void handleDelete(todo)} className="rounded-lg border border-[#f1c7cd] px-2 py-1 text-xs">削除</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {error && <p className="mt-4 rounded-xl border border-[#ffd4dc] bg-[#fff4f6] px-4 py-3 text-sm text-[#a31f2b]">{error}</p>}
      </main>

      {dupSource && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f1f35]/45 px-4">
          <div className="glass-card w-full max-w-xl rounded-2xl p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-[#17355f]">次回分を作成</h3>
              <button type="button" onClick={closeDuplicate} className="rounded-lg border border-[#cfdbeb] px-2 py-1 text-xs">閉じる</button>
            </div>
            <form onSubmit={submitDuplicate} className="space-y-3">
              <label className="block text-sm text-muted" htmlFor="dupTitle">件名</label>
              <input id="dupTitle" value={dupTitle} onChange={(event) => setDupTitle(event.target.value)} className="w-full rounded-xl border border-[#c9d8ea] bg-white px-3 py-2 text-sm" />
              <label className="block text-sm text-muted" htmlFor="dupDueDate">日付</label>
              <input id="dupDueDate" type="date" value={dupDueDate} onChange={(event) => setDupDueDate(event.target.value)} className="w-full rounded-xl border border-[#c9d8ea] bg-white px-3 py-2 text-sm" />
              <label className="block text-sm text-muted" htmlFor="dupMemo">メモ</label>
              <textarea id="dupMemo" value={dupMemo} onChange={(event) => setDupMemo(event.target.value)} rows={3} className="w-full rounded-xl border border-[#c9d8ea] bg-white px-3 py-2 text-sm" />
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-sm text-muted" htmlFor="dupCategory">カテゴリ</label>
                  <select id="dupCategory" value={dupCategory} onChange={(event) => setDupCategory(event.target.value as TodoCategory)} className="w-full rounded-xl border border-[#c9d8ea] bg-white px-3 py-2 text-sm">
                    {Object.entries(CATEGORY_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-muted" htmlFor="dupPriority">重要度</label>
                  <select id="dupPriority" value={dupPriority} onChange={(event) => setDupPriority(event.target.value as TodoPriority)} className="w-full rounded-xl border border-[#c9d8ea] bg-white px-3 py-2 text-sm">
                    {Object.entries(PRIORITY_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={closeDuplicate} className="rounded-xl border border-[#cfdbeb] px-4 py-2 text-sm">キャンセル</button>
                <button type="submit" disabled={dupSaving} className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{dupSaving ? "作成中..." : "作成"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#0f1f35]/45 px-4">
          <div className="glass-card w-full max-w-xl rounded-2xl p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-[#17355f]">タスク編集</h3>
              <button type="button" onClick={closeEdit} className="rounded-lg border border-[#cfdbeb] px-2 py-1 text-xs">閉じる</button>
            </div>
            <form onSubmit={submitEdit} className="space-y-3">
              <label className="block text-sm text-muted" htmlFor="editTitle">件名</label>
              <input id="editTitle" value={editTitle} onChange={(event) => setEditTitle(event.target.value)} className="w-full rounded-xl border border-[#c9d8ea] bg-white px-3 py-2 text-sm" />
              <label className="block text-sm text-muted" htmlFor="editDueAt">日付</label>
              <input id="editDueAt" type="date" value={editDueDate} onChange={(event) => setEditDueDate(event.target.value)} className="w-full rounded-xl border border-[#c9d8ea] bg-white px-3 py-2 text-sm" />
              <label className="block text-sm text-muted" htmlFor="editMemo">メモ</label>
              <textarea id="editMemo" value={editMemo} onChange={(event) => setEditMemo(event.target.value)} rows={3} className="w-full rounded-xl border border-[#c9d8ea] bg-white px-3 py-2 text-sm" />
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-sm text-muted" htmlFor="editCategory">カテゴリ</label>
                  <select id="editCategory" value={editCategory} onChange={(event) => setEditCategory(event.target.value as TodoCategory)} className="w-full rounded-xl border border-[#c9d8ea] bg-white px-3 py-2 text-sm">
                    {Object.entries(CATEGORY_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-muted" htmlFor="editPriority">重要度</label>
                  <select id="editPriority" value={editPriority} onChange={(event) => setEditPriority(event.target.value as TodoPriority)} className="w-full rounded-xl border border-[#c9d8ea] bg-white px-3 py-2 text-sm">
                    {Object.entries(PRIORITY_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={closeEdit} className="rounded-xl border border-[#cfdbeb] px-4 py-2 text-sm">キャンセル</button>
                <button type="submit" disabled={editSaving} className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{editSaving ? "保存中..." : "保存"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {historyTodo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f1f35]/45 px-4">
          <div className="glass-card w-full max-w-xl rounded-2xl p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-[#17355f]">編集履歴: {historyTodo.title}</h3>
              <button type="button" onClick={closeEditHistory} className="rounded-lg border border-[#cfdbeb] px-2 py-1 text-xs">閉じる</button>
            </div>
            {historyLoading ? (
              <p className="text-sm text-muted">読み込み中...</p>
            ) : editHistories.length === 0 ? (
              <p className="text-sm text-muted">編集履歴はまだありません。</p>
            ) : (
              <ul className="max-h-[50vh] space-y-2 overflow-auto pr-1">
                {editHistories.map((history, index) => (
                  <li key={history.id} className="rounded-lg border border-[#d8e3f1] bg-white/85 px-3 py-2 text-sm text-[#1b3f6a]">
                    {index + 1}. {formatDateTime(history.editedAt)}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
