"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { CompletedTodosSection } from "./_components/todos/CompletedTodosSection";
import { CompletionToast } from "./_components/todos/CompletionToast";
import { DesktopDashboard } from "./_components/todos/DesktopDashboard";
import { DuplicateTodoModal } from "./_components/todos/DuplicateTodoModal";
import { EditHistoryModal } from "./_components/todos/EditHistoryModal";
import { EditTodoModal } from "./_components/todos/EditTodoModal";
import { NotificationPanel } from "./_components/todos/NotificationPanel";
import { PendingTodosSection } from "./_components/todos/PendingTodosSection";
import {
  toDateInputValue,
  toJstMidnightIso,
  type AppNotification,
  type DueFilter,
  type SelectableCategory,
  type SelectableAssignee,
  type SelectablePriority,
  type SelectableStatus,
  type Todo,
  type TodoCategory,
  type TodoEditHistory,
  type TodoPriority,
  type TodoStatus,
} from "./_components/todos/model";

type CategoriesResponse = {
  all: string[];
  builtinLabels?: Record<string, string>;
};

type TodoStats = {
  total: number;
  pending: number;
  completed: number;
  dueSoon: number;
  overdue: number;
};

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

function getTokyoYmdOffset(days: number) {
  const date = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  return getTokyoYmd(date);
}

function toJstStartIso(ymd: string) {
  return new Date(`${ymd}T00:00:00+09:00`).toISOString();
}

function toJstEndIso(ymd: string) {
  return new Date(`${ymd}T23:59:59.999+09:00`).toISOString();
}

export default function Home() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [categoryOptions, setCategoryOptions] = useState<string[]>([
    "WORK",
    "PRIVATE",
    "PROCEDURE",
    "STUDY",
    "HEALTH",
    "SHOPPING",
    "OTHER",
  ]);
  const [categoryLabelMap, setCategoryLabelMap] = useState<Record<string, string>>({
    WORK: "仕事",
    PRIVATE: "プライベート",
    PROCEDURE: "手続き",
    STUDY: "学習",
    HEALTH: "健康",
    SHOPPING: "買い物",
    OTHER: "その他",
  });
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<SelectableCategory>("ALL");
  const [filterPriority, setFilterPriority] = useState<SelectablePriority>("ALL");
  const [filterAssignee, setFilterAssignee] = useState<SelectableAssignee>("ALL");
  const [filterStatus, setFilterStatus] = useState<SelectableStatus>("ALL");
  const [filterDue, setFilterDue] = useState<DueFilter>("ALL");

  const [editing, setEditing] = useState<Todo | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editMemo, setEditMemo] = useState("");
  const [editCategory, setEditCategory] = useState<TodoCategory>("OTHER");
  const [editPriority, setEditPriority] = useState<TodoPriority>("MEDIUM");
  const [editStatus, setEditStatus] = useState<TodoStatus>("OPEN");
  const [editAssignee, setEditAssignee] = useState<"SELF" | "UNASSIGNED">("SELF");
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
  const [dupStatus, setDupStatus] = useState<TodoStatus>("OPEN");
  const [dupAssignee, setDupAssignee] = useState<"SELF" | "UNASSIGNED">("SELF");
  const [dupDueDate, setDupDueDate] = useState("");
  const [dupSaving, setDupSaving] = useState(false);

  const [historyTodo, setHistoryTodo] = useState<Todo | null>(null);
  const [editHistories, setEditHistories] = useState<TodoEditHistory[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userDisplayName, setUserDisplayName] = useState("ユーザー");
  const [kpiOpen, setKpiOpen] = useState(false);
  const [desktopSidebarCollapsed, setDesktopSidebarCollapsed] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [selectedTodoIds, setSelectedTodoIds] = useState<Set<number>>(new Set());
  const [bulkPending, setBulkPending] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Todo | null>(null);
  const [deletePending, setDeletePending] = useState(false);
  const [stats, setStats] = useState<TodoStats>({
    total: 0,
    pending: 0,
    completed: 0,
    dueSoon: 0,
    overdue: 0,
  });
  const [calendarTodos, setCalendarTodos] = useState<Todo[]>([]);
  const [reloadSeed, setReloadSeed] = useState(0);

  useEffect(() => {
    const fetchInitial = async () => {
      try {
        const [notifRes, categoryRes] = await Promise.all([
          fetch("/api/notifications", { cache: "no-store" }),
          fetch("/api/categories", { cache: "no-store" }),
        ]);

        if (categoryRes.ok) {
          const data = (await categoryRes.json()) as CategoriesResponse;
          if (Array.isArray(data.all) && data.all.length > 0) {
            setCategoryOptions(data.all);
            setFilterCategory((current) => (current === "ALL" || data.all.includes(current) ? current : "ALL"));
            setEditCategory((current) => (data.all.includes(current) ? current : (data.all[0] ?? "OTHER")));
            setDupCategory((current) => (data.all.includes(current) ? current : (data.all[0] ?? "OTHER")));
          }
          if (data.builtinLabels) {
            setCategoryLabelMap(data.builtinLabels);
          }
        }

        if (notifRes.ok) {
          setNotifications((await notifRes.json()) as AppNotification[]);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "データ取得に失敗しました。");
      }
    };
    void fetchInitial();
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
        const body = (await res.json()) as {
          user?: { role?: string; displayName?: string; email?: string };
        };
        if (!cancelled) {
          setIsAdmin(body.user?.role === "ADMIN");
          const fallback = body.user?.email?.split("@")[0] ?? "ユーザー";
          setUserDisplayName(body.user?.displayName?.trim() || fallback);
        }
      } catch {
        if (!cancelled) {
          setIsAdmin(false);
          setUserDisplayName("ユーザー");
        }
      }
    };

    void fetchSession();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const fetchCalendarTodos = async () => {
      try {
        const res = await fetch("/api/todos?completed=false", { cache: "no-store" });
        if (!res.ok) return;
        const body = (await res.json()) as Todo[];
        if (!cancelled) setCalendarTodos(body);
      } catch {
        // ignore calendar fetch errors
      }
    };
    void fetchCalendarTodos();
    return () => {
      cancelled = true;
    };
  }, [reloadSeed]);

  useEffect(() => {
    let cancelled = false;
    const fetchStats = async () => {
      try {
        const res = await fetch("/api/todos/stats", { cache: "no-store" });
        if (!res.ok) return;
        const body = (await res.json()) as TodoStats;
        if (!cancelled) setStats(body);
      } catch {
        // ignore stats fetch errors and keep current values
      }
    };
    void fetchStats();
    return () => {
      cancelled = true;
    };
  }, [reloadSeed]);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        const trimmed = search.trim();
        if (trimmed) params.set("q", trimmed);
        if (filterCategory !== "ALL") params.set("category", filterCategory);
        if (filterPriority !== "ALL") params.set("priority", filterPriority);
        if (filterAssignee !== "ALL") params.set("assignee", filterAssignee);
        if (filterStatus !== "ALL") params.set("status", filterStatus);
        if (filterDue === "TODAY") {
          const ymd = getTokyoYmdOffset(0);
          params.set("dueFrom", toJstStartIso(ymd));
          params.set("dueTo", toJstEndIso(ymd));
        } else if (filterDue === "IN_7_DAYS") {
          params.set("dueFrom", toJstStartIso(getTokyoYmdOffset(0)));
          params.set("dueTo", toJstEndIso(getTokyoYmdOffset(7)));
        } else if (filterDue === "OVERDUE") {
          params.set("dueTo", toJstEndIso(getTokyoYmdOffset(-1)));
        }
        const url = params.size > 0 ? `/api/todos?${params.toString()}` : "/api/todos";
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) {
          throw new Error(await getApiErrorMessage(res, "データ取得に失敗しました。"));
        }
        const body = (await res.json()) as Todo[];
        if (!cancelled) setTodos(body);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "データ取得に失敗しました。");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 180);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [search, filterCategory, filterPriority, filterAssignee, filterStatus, filterDue, reloadSeed]);

  useEffect(() => {
    const onScroll = () => {
      setShowBackToTop(window.scrollY > 120);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  useEffect(() => {
    const todoIds = new Set(todos.map((todo) => todo.id));
    setSelectedTodoIds((current) => {
      const next = new Set<number>();
      current.forEach((id) => {
        if (todoIds.has(id)) next.add(id);
      });
      return next;
    });
  }, [todos]);

  const pendingTodos = useMemo(
    () =>
      todos
        .filter((todo) => !todo.completed)
        .sort((a, b) => {
          const dueDiff = +new Date(a.dueAt) - +new Date(b.dueAt);
          if (dueDiff !== 0) return dueDiff;
          const priorityWeight: Record<TodoPriority, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };
          return priorityWeight[a.priority] - priorityWeight[b.priority];
        }),
    [todos],
  );
  const completedTodos = useMemo(
    () => todos.filter((todo) => todo.completed).sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt)),
    [todos],
  );
  const unreadCount = notifications.filter((notification) => !notification.readAt).length;
  const selectedTodos = useMemo(
    () => todos.filter((todo) => selectedTodoIds.has(todo.id)),
    [todos, selectedTodoIds],
  );
  const selectedPendingIds = useMemo(
    () => selectedTodos.filter((todo) => !todo.completed).map((todo) => todo.id),
    [selectedTodos],
  );
  const selectedCompletedIds = useMemo(
    () => selectedTodos.filter((todo) => todo.completed).map((todo) => todo.id),
    [selectedTodos],
  );
  const refreshTodosAndStats = () => {
    setReloadSeed((current) => current + 1);
  };

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
    setDupStatus(toastTodo.status);
    setDupAssignee(toastTodo.assigneeUserId ? "SELF" : "UNASSIGNED");
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
              status: nextCompleted ? "DONE" : "OPEN",
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
      refreshTodosAndStats();
    } catch (e) {
      setTodos((list) => list.map((item) => (item.id === previous.id ? previous : item)));
      if (nextCompleted) closeToast();
      setError(e instanceof Error ? e.message : "更新に失敗しました。");
    }
  };

  const openDeleteModal = (todo: Todo) => {
    setDeleteTarget(todo);
  };

  const toggleSelectTodo = (todoId: number) => {
    setSelectedTodoIds((current) => {
      const next = new Set(current);
      if (next.has(todoId)) {
        next.delete(todoId);
      } else {
        next.add(todoId);
      }
      return next;
    });
  };

  const toggleSelectAllInList = (todoIds: number[], checked: boolean) => {
    setSelectedTodoIds((current) => {
      const next = new Set(current);
      for (const id of todoIds) {
        if (checked) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  };

  const clearSelectedTodos = () => {
    setSelectedTodoIds(new Set());
  };

  const bulkToggleCompleted = async (targetIds: number[], completed: boolean) => {
    if (targetIds.length === 0 || bulkPending) return;
    setBulkPending(true);
    setError(null);

    const results = await Promise.allSettled(
      targetIds.map(async (id) => {
        const res = await fetch(`/api/todos/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ completed }),
        });
        if (!res.ok) {
          const message = await getApiErrorMessage(res, "更新に失敗しました。");
          throw new Error(message);
        }
        return (await res.json()) as Todo;
      }),
    );
    const updatedTodos = results
      .filter((result): result is PromiseFulfilledResult<Todo> => result.status === "fulfilled")
      .map((result) => result.value);
    const failedCount = results.length - updatedTodos.length;

    if (updatedTodos.length > 0) {
      const map = new Map(updatedTodos.map((todo) => [todo.id, todo]));
      setTodos((current) => current.map((todo) => map.get(todo.id) ?? todo));
      refreshTodosAndStats();
    }
    if (failedCount > 0) {
      setError(`更新に失敗したタスクがあります（${failedCount}件）。`);
    }
    setSelectedTodoIds((current) => {
      const next = new Set(current);
      for (const id of targetIds) next.delete(id);
      return next;
    });
    setBulkPending(false);
  };

  const bulkDeleteTodos = async (targetIds: number[]) => {
    if (targetIds.length === 0 || bulkPending) return;
    setBulkPending(true);
    setError(null);

    const results = await Promise.allSettled(
      targetIds.map(async (id) => {
        const res = await fetch(`/api/todos/${id}`, { method: "DELETE" });
        if (!res.ok) throw new Error(await getApiErrorMessage(res, "削除に失敗しました。"));
      }),
    );
    const failedIds = new Set<number>();
    results.forEach((result, index) => {
      if (result.status === "rejected") failedIds.add(targetIds[index]);
    });

    setTodos((current) =>
      current.filter((todo) => !targetIds.includes(todo.id) || failedIds.has(todo.id)),
    );
    setSelectedTodoIds((current) => {
      const next = new Set(current);
      for (const id of targetIds) next.delete(id);
      return next;
    });
    if (failedIds.size > 0) {
      setError(`削除に失敗したタスクがあります（${failedIds.size}件）。`);
    } else {
      refreshTodosAndStats();
    }
    setBulkPending(false);
  };

  const closeDeleteModal = () => {
    if (deletePending) return;
    setDeleteTarget(null);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const snapshot = todos;
    setDeletePending(true);
    setTodos((list) => list.filter((item) => item.id !== deleteTarget.id));
    try {
      const res = await fetch(`/api/todos/${deleteTarget.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await getApiErrorMessage(res, "削除に失敗しました。"));
      setDeleteTarget(null);
      refreshTodosAndStats();
    } catch (e) {
      setTodos(snapshot);
      setError(e instanceof Error ? e.message : "削除に失敗しました。");
    } finally {
      setDeletePending(false);
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
    setEditStatus(todo.status);
    setEditAssignee(todo.assigneeUserId ? "SELF" : "UNASSIGNED");
    setEditDueDate(toDateInputValue(todo.dueAt));
    setError(null);
  };

  const closeEdit = () => {
    setEditing(null);
    setEditTitle("");
    setEditMemo("");
    setEditCategory("OTHER");
    setEditPriority("MEDIUM");
    setEditStatus("OPEN");
    setEditAssignee("SELF");
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
          status: editStatus,
          assigneeUserId: editAssignee,
          dueAt: toJstMidnightIso(editDueDate),
        }),
      });
      if (!res.ok) throw new Error(await getApiErrorMessage(res, "編集に失敗しました。"));
      const saved = (await res.json()) as Todo;
      setTodos((list) => list.map((item) => (item.id === saved.id ? saved : item)));
      closeEdit();
      refreshTodosAndStats();
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
    setDupStatus("OPEN");
    setDupAssignee("SELF");
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
          status: dupStatus,
          assigneeUserId: dupAssignee,
        }),
      });
      if (!res.ok) throw new Error(await getApiErrorMessage(res, "次回分作成に失敗しました。"));
      const created = (await res.json()) as Todo;
      setTodos((list) => [created, ...list]);
      closeDuplicate();
      refreshTodosAndStats();
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

      <DesktopDashboard
        loading={loading}
        error={error}
        isAdmin={isAdmin}
        notifications={notifications}
        notificationOpen={notificationOpen}
        unreadCount={unreadCount}
        onToggleNotification={() => setNotificationOpen((prev) => !prev)}
        onMarkRead={(id) => void markRead(id)}
        onMarkAllRead={() => void markAllRead()}
        onLogout={() => void signOut({ callbackUrl: "/login" })}
        userDisplayName={userDisplayName}
        dashboardStats={stats}
        search={search}
        filterCategory={filterCategory}
        filterPriority={filterPriority}
        filterAssignee={filterAssignee}
        filterStatus={filterStatus}
        filterDue={filterDue}
        categoryOptions={categoryOptions}
        categoryLabelMap={categoryLabelMap}
        onSearchChange={setSearch}
        onFilterCategoryChange={setFilterCategory}
        onFilterPriorityChange={setFilterPriority}
        onFilterAssigneeChange={setFilterAssignee}
        onFilterStatusChange={setFilterStatus}
        onFilterDueChange={setFilterDue}
        pendingTodos={pendingTodos}
        completedTodos={completedTodos}
        calendarTodos={calendarTodos}
        selectedIds={selectedTodoIds}
        onToggleSelect={toggleSelectTodo}
        onToggleSelectPendingAll={(checked) =>
          toggleSelectAllInList(
            pendingTodos.map((todo) => todo.id),
            checked,
          )
        }
        onToggleSelectCompletedAll={(checked) =>
          toggleSelectAllInList(
            completedTodos.map((todo) => todo.id),
            checked,
          )
        }
        onToggle={(todo) => void handleToggle(todo)}
        onEdit={openEdit}
        onOpenEditHistory={(todo) => void openEditHistory(todo)}
        onDelete={(todo) => openDeleteModal(todo)}
        selectedCount={selectedTodoIds.size}
        bulkPending={bulkPending}
        canBulkComplete={selectedPendingIds.length > 0}
        canBulkReopen={selectedCompletedIds.length > 0}
        onBulkComplete={() => void bulkToggleCompleted(selectedPendingIds, true)}
        onBulkReopen={() => void bulkToggleCompleted(selectedCompletedIds, false)}
        onBulkDelete={() => void bulkDeleteTodos(Array.from(selectedTodoIds))}
        onClearSelected={clearSelectedTodos}
        sidebarCollapsed={desktopSidebarCollapsed}
        onToggleSidebar={() => setDesktopSidebarCollapsed((prev) => !prev)}
      />

      <main className="relative z-10 mx-auto w-full max-w-6xl px-4 py-6 pb-28 md:hidden">
        <section className="relative flex h-[clamp(72px,10vh,96px)] items-center overflow-hidden rounded-[22px] border border-[#bfdbf5] bg-[linear-gradient(128deg,#102f57_0%,#174786_55%,#2e66a4_100%)] px-3 text-white shadow-[0_18px_50px_-34px_#103058] sm:px-4 md:rounded-[24px] md:px-5">
          <div className="pointer-events-none absolute -right-10 -top-10 hidden h-24 w-24 rounded-full border border-white/20 sm:block" />
          <div className="pointer-events-none absolute right-20 top-2 hidden h-10 w-10 rounded-full border border-white/20 sm:block" />
          <div className="pointer-events-none absolute -bottom-14 left-10 hidden h-24 w-24 rounded-full bg-[radial-gradient(circle,#9ec8ff44_0%,#9ec8ff00_70%)] sm:block" />
          <div className="min-w-0 pr-4 sm:pr-44">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#c3ddff] sm:text-[11px]">Task Radar</p>
            <h1 className="mt-1 truncate text-[clamp(14px,2.2vw,20px)] font-bold tracking-tight">Todoコントロールセンター</h1>
            <p className="mt-0.5 text-[10px] text-[#d7e9ff] sm:text-[11px]">{userDisplayName}さん</p>
          </div>

          <div className="absolute right-3 top-3 hidden items-center gap-2 sm:right-4 sm:top-4 sm:flex">
            <Link
              href="/calendar"
              className="rounded-lg border border-white/35 bg-white/10 px-2 py-1 text-[11px] font-semibold text-white backdrop-blur sm:px-2.5 sm:py-1.5 sm:text-xs"
            >
              カレンダー
            </Link>
            <Link
              href="/categories"
              className="rounded-lg border border-white/35 bg-white/10 px-2 py-1 text-[11px] font-semibold text-white backdrop-blur sm:px-2.5 sm:py-1.5 sm:text-xs"
            >
              カテゴリ
            </Link>
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

        <section className="mt-2 sm:hidden">
          <div className="grid grid-cols-3 gap-2">
            <Link
              href="/calendar"
              className="rounded-lg border border-[#c8d9ec] bg-white px-2 py-2 text-center text-[12px] font-semibold text-[#214f84]"
            >
              カレンダー
            </Link>
            <Link
              href="/categories"
              className="rounded-lg border border-[#c8d9ec] bg-white px-2 py-2 text-center text-[12px] font-semibold text-[#214f84]"
            >
              カテゴリ
            </Link>
            <button
              type="button"
              onClick={() => void signOut({ callbackUrl: "/login" })}
              className="rounded-lg border border-[#c8d9ec] bg-white px-2 py-2 text-center text-[12px] font-semibold text-[#214f84]"
            >
              ログアウト
            </button>
          </div>
          {isAdmin && (
            <div className="mt-2">
              <Link
                href="/admin"
                className="block rounded-lg border border-[#c8d9ec] bg-white px-2 py-2 text-center text-[12px] font-semibold text-[#214f84]"
              >
                管理者
              </Link>
            </div>
          )}
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
                <p className="text-sm font-semibold text-[#14355d]">総タスク {stats.total} 件</p>
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
                  <p className="mt-1 text-xl font-bold leading-none text-[#14355d]">{stats.total}</p>
                </article>
                <article className="glass-card rounded-xl border border-[#d3e2f3] bg-white/90 p-2.5">
                  <p className="text-[10px] text-[#59799e]">未完了</p>
                  <p className="mt-1 text-xl font-bold leading-none text-[#14355d]">{stats.pending}</p>
                </article>
                <article className="glass-card rounded-xl border border-[#d3e2f3] bg-white/90 p-2.5">
                  <p className="text-[10px] text-[#59799e]">完了</p>
                  <p className="mt-1 text-xl font-bold leading-none text-[#14355d]">{stats.completed}</p>
                </article>
                <article className="glass-card rounded-xl border border-[#d3e2f3] bg-white/90 p-2.5">
                  <p className="text-[10px] text-[#59799e]">7日以内</p>
                  <p className="mt-1 text-xl font-bold leading-none text-[#14355d]">{stats.dueSoon}</p>
                </article>
                <article className="glass-card col-span-2 rounded-xl border border-[#f0d3d8] bg-[#fff8f9] p-2.5">
                  <p className="text-[10px] text-[#916173]">期限切れ</p>
                  <p className="mt-1 text-xl font-bold leading-none text-[#a23247]">{stats.overdue}</p>
                </article>
              </div>
            </div>
          </div>

          <div className="hidden gap-2.5 md:flex">
            <article className="glass-card min-w-[112px] flex-1 rounded-2xl border border-[#d3e2f3] bg-white/90 p-3 lg:p-4">
              <p className="text-[11px] text-[#59799e]">総タスク</p>
              <p className="mt-1 text-[clamp(22px,2.2vw,30px)] font-bold leading-none text-[#14355d]">{stats.total}</p>
            </article>
            <article className="glass-card min-w-[112px] flex-1 rounded-2xl border border-[#d3e2f3] bg-white/90 p-3 lg:p-4">
              <p className="text-[11px] text-[#59799e]">未完了</p>
              <p className="mt-1 text-[clamp(22px,2.2vw,30px)] font-bold leading-none text-[#14355d]">{stats.pending}</p>
            </article>
            <article className="glass-card min-w-[112px] flex-1 rounded-2xl border border-[#d3e2f3] bg-white/90 p-3 lg:p-4">
              <p className="text-[11px] text-[#59799e]">完了</p>
              <p className="mt-1 text-[clamp(22px,2.2vw,30px)] font-bold leading-none text-[#14355d]">{stats.completed}</p>
            </article>
            <article className="glass-card min-w-[112px] flex-1 rounded-2xl border border-[#d3e2f3] bg-white/90 p-3 lg:p-4">
              <p className="text-[11px] text-[#59799e]">7日以内</p>
              <p className="mt-1 text-[clamp(22px,2.2vw,30px)] font-bold leading-none text-[#14355d]">{stats.dueSoon}</p>
            </article>
            <article className="glass-card min-w-[112px] flex-1 rounded-2xl border border-[#f0d3d8] bg-[#fff8f9] p-3 lg:p-4">
              <p className="text-[11px] text-[#916173]">期限切れ</p>
              <p className="mt-1 text-[clamp(22px,2.2vw,30px)] font-bold leading-none text-[#a23247]">{stats.overdue}</p>
            </article>
          </div>
        </section>

        <PendingTodosSection
          loading={loading}
          todos={pendingTodos}
          selectedIds={selectedTodoIds}
          categoryOptions={categoryOptions}
          categoryLabelMap={categoryLabelMap}
          search={search}
        filterCategory={filterCategory}
        filterPriority={filterPriority}
        filterAssignee={filterAssignee}
        filterStatus={filterStatus}
          filterDue={filterDue}
          onSearchChange={setSearch}
        onFilterCategoryChange={setFilterCategory}
        onFilterPriorityChange={setFilterPriority}
        onFilterAssigneeChange={setFilterAssignee}
        onFilterStatusChange={setFilterStatus}
          onFilterDueChange={setFilterDue}
          onToggleSelect={toggleSelectTodo}
          onToggleSelectAll={(checked) =>
            toggleSelectAllInList(
              pendingTodos.map((todo) => todo.id),
              checked,
            )
          }
          onToggle={(todo) => void handleToggle(todo)}
          onEdit={openEdit}
          onOpenEditHistory={(todo) => void openEditHistory(todo)}
          onDelete={(todo) => openDeleteModal(todo)}
        />

        <CompletedTodosSection
          todos={completedTodos}
          selectedIds={selectedTodoIds}
          onToggleSelect={toggleSelectTodo}
          onToggleSelectAll={(checked) =>
            toggleSelectAllInList(
              completedTodos.map((todo) => todo.id),
              checked,
            )
          }
          onToggle={(todo) => void handleToggle(todo)}
          onDelete={(todo) => openDeleteModal(todo)}
        />

        {selectedTodoIds.size > 0 && (
          <section className="mt-4 rounded-2xl border border-[#d5e3f2] bg-white/92 p-3 shadow-[0_18px_48px_-38px_#12355d] md:p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-[#17355f]">
                {selectedTodoIds.size}件を選択中
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={bulkPending || selectedPendingIds.length === 0}
                  onClick={() => void bulkToggleCompleted(selectedPendingIds, true)}
                  className="rounded-lg border border-[#8ab0d5] bg-white px-3 py-1.5 text-xs text-[#1f4f86] disabled:opacity-50"
                >
                  完了にする
                </button>
                <button
                  type="button"
                  disabled={bulkPending || selectedCompletedIds.length === 0}
                  onClick={() => void bulkToggleCompleted(selectedCompletedIds, false)}
                  className="rounded-lg border border-[#9accb7] bg-white px-3 py-1.5 text-xs text-[#1e6c57] disabled:opacity-50"
                >
                  未完了に戻す
                </button>
                <button
                  type="button"
                  disabled={bulkPending}
                  onClick={() => void bulkDeleteTodos(Array.from(selectedTodoIds))}
                  className="rounded-lg border border-[#efb7c0] bg-[#fff1f3] px-3 py-1.5 text-xs font-semibold text-[#9e2740] disabled:opacity-50"
                >
                  削除
                </button>
                <button
                  type="button"
                  disabled={bulkPending}
                  onClick={clearSelectedTodos}
                  className="rounded-lg border border-[#c9d8ea] bg-white px-3 py-1.5 text-xs text-[#335a87] disabled:opacity-50"
                >
                  選択解除
                </button>
              </div>
            </div>
          </section>
        )}

        {error && (
          <p className="mt-4 rounded-xl border border-[#ffd4dc] bg-[#fff4f6] px-4 py-3 text-sm text-[#a31f2b]">
            {error}
          </p>
        )}
      </main>

      {notificationOpen && (
        <div className="fixed inset-x-4 bottom-24 z-30 md:hidden">
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
            <span aria-hidden>??</span>
            {unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full bg-[#d62246] px-1.5 py-0.5 text-[10px] font-bold text-white">
                {unreadCount}
              </span>
            )}
          </button>
        </div>
      </div>

      <Link
        href="/tasks/new"
        className="fixed bottom-24 right-4 z-50 inline-flex h-12 min-w-12 items-center justify-center rounded-full border border-[#9ac0e5] bg-[linear-gradient(135deg,#1d5da8_0%,#256ab8_100%)] px-3 text-sm font-semibold text-white shadow-[0_16px_30px_-18px_#12355d] transition-transform duration-200 active:scale-95 md:hidden"
        aria-label="新規作成"
      >
        <span className="mr-1 text-lg leading-none">+</span>
        作成
      </Link>

      <button
        type="button"
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        aria-label="ページ最上部へ戻る"
        className={`fixed left-1/2 z-30 -translate-x-1/2 rounded-full border border-[#bfd3ea] bg-white/92 px-3 py-1.5 text-xs font-semibold text-[#24558f] shadow-[0_12px_28px_-20px_#12355d] backdrop-blur transition-all duration-300 md:bottom-6 ${
          showBackToTop
            ? "bottom-20 opacity-100 translate-y-0"
            : "pointer-events-none bottom-16 translate-y-2 opacity-0"
        }`}
      >
        ↑ トップへ
      </button>

      {dupSource && (
        <DuplicateTodoModal
          source={dupSource}
          title={dupTitle}
          memo={dupMemo}
          dueDate={dupDueDate}
          category={dupCategory}
          categoryOptions={categoryOptions}
          categoryLabelMap={categoryLabelMap}
          priority={dupPriority}
          status={dupStatus}
          assignee={dupAssignee}
          saving={dupSaving}
          onTitleChange={setDupTitle}
          onMemoChange={setDupMemo}
          onDueDateChange={setDupDueDate}
          onCategoryChange={setDupCategory}
          onPriorityChange={setDupPriority}
          onStatusChange={setDupStatus}
          onAssigneeChange={setDupAssignee}
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
          categoryOptions={categoryOptions}
          categoryLabelMap={categoryLabelMap}
          priority={editPriority}
          status={editStatus}
          assignee={editAssignee}
          saving={editSaving}
          onTitleChange={setEditTitle}
          onMemoChange={setEditMemo}
          onDueDateChange={setEditDueDate}
          onCategoryChange={setEditCategory}
          onPriorityChange={setEditPriority}
          onStatusChange={setEditStatus}
          onAssigneeChange={setEditAssignee}
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

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0b1d33]/40 px-4">
          <div className="w-full max-w-sm rounded-2xl border border-[#d3e2f3] bg-white p-5 shadow-[0_28px_60px_-35px_#0f2d53]">
            <p className="text-sm font-semibold text-[#12345b]">タスク削除の確認</p>
            <p className="mt-2 text-sm text-[#456587]">
              「{deleteTarget.title}」を削除します。元に戻せません。
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeDeleteModal}
                disabled={deletePending}
                className="rounded-lg border border-[#c9d8ea] bg-white px-3 py-1.5 text-xs text-[#23486f] disabled:opacity-60"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={() => void confirmDelete()}
                disabled={deletePending}
                className="rounded-lg border border-[#efb7c0] bg-[#fff1f3] px-3 py-1.5 text-xs font-semibold text-[#9e2740] disabled:opacity-60"
              >
                {deletePending ? "削除中..." : "削除する"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


