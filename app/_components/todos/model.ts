export type TodoCategory = string;

export type TodoPriority = "HIGH" | "MEDIUM" | "LOW";
export type TodoStatus = "OPEN" | "IN_PROGRESS" | "BLOCKED" | "DONE";
export type DueFilter = "ALL" | "TODAY" | "IN_7_DAYS" | "OVERDUE";
export type SelectableCategory = "ALL" | string;
export type SelectablePriority = "ALL" | TodoPriority;
export type SelectableStatus = "ALL" | TodoStatus;
export type SelectableAssignee = "ALL" | "SELF" | "UNASSIGNED";

export type Todo = {
  id: number;
  title: string;
  memo: string | null;
  category: TodoCategory;
  priority: TodoPriority;
  status: TodoStatus;
  assigneeUserId: string | null;
  completed: boolean;
  dueAt: string;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AppNotification = {
  id: number;
  message: string;
  createdAt: string;
  readAt: string | null;
  todo: { id: number; title: string; dueAt: string; completed: boolean };
};

export type TodoEditHistory = {
  id: number;
  editedAt: string;
};

const BUILTIN_CATEGORY_LABEL: Record<string, string> = {
  WORK: "仕事",
  PRIVATE: "プライベート",
  PROCEDURE: "手続き",
  STUDY: "学習",
  HEALTH: "健康",
  SHOPPING: "買い物",
  OTHER: "その他",
};

export function categoryLabel(value: string, labelMap?: Record<string, string>) {
  if (labelMap && labelMap[value]) return labelMap[value];
  return BUILTIN_CATEGORY_LABEL[value] ?? value;
}

export const PRIORITY_LABEL: Record<TodoPriority, string> = {
  HIGH: "高",
  MEDIUM: "中",
  LOW: "低",
};

export const STATUS_LABEL: Record<TodoStatus, string> = {
  OPEN: "未着手",
  IN_PROGRESS: "進行中",
  BLOCKED: "保留",
  DONE: "完了",
};

export const DUE_FILTER_LABEL: Record<DueFilter, string> = {
  ALL: "すべて",
  TODAY: "今日",
  IN_7_DAYS: "7日以内",
  OVERDUE: "期限切れ",
};

export function formatDate(isoString: string) {
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(isoString));
}

export function formatDateTime(isoString: string) {
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(isoString));
}

export function toDateInputValue(isoString: string) {
  const d = new Date(isoString);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function toJstMidnightIso(dateInput: string) {
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

export function getDueStatus(isoString: string): "ok" | "warning" | "danger" {
  const dueKey = getTokyoYmd(isoString);
  const todayKey = getTokyoYmdWithOffset(0);
  const in7Key = getTokyoYmdWithOffset(7);
  if (dueKey < todayKey) return "danger";
  if (dueKey <= in7Key) return "warning";
  return "ok";
}

export function matchesDueFilter(todo: Todo, filter: DueFilter) {
  if (filter === "ALL") return true;
  const dueKey = getTokyoYmd(todo.dueAt);
  const todayKey = getTokyoYmdWithOffset(0);
  const in7Key = getTokyoYmdWithOffset(7);
  if (filter === "TODAY") return dueKey === todayKey;
  if (filter === "IN_7_DAYS") return dueKey >= todayKey && dueKey <= in7Key;
  return dueKey < todayKey;
}

export function getCardTone(status: "ok" | "warning" | "danger") {
  if (status === "danger") return "border-[#f3a9b2] bg-[#fff1f3]";
  if (status === "warning") return "border-[#ffd49a] bg-[#fff8ee]";
  return "border-[#d7e6f4] bg-white/95";
}
