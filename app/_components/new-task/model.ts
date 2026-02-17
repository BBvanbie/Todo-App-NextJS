export type TodoCategory = string;

export type TodoPriority = "HIGH" | "MEDIUM" | "LOW";
export type TodoStatus = "OPEN" | "IN_PROGRESS" | "BLOCKED" | "DONE";
export type TodoAssigneeInput = "SELF" | "UNASSIGNED";

export const PRIORITY_OPTIONS: Array<{ value: TodoPriority; label: string }> = [
  { value: "HIGH", label: "高" },
  { value: "MEDIUM", label: "中" },
  { value: "LOW", label: "低" },
];

export const STATUS_OPTIONS: Array<{ value: TodoStatus; label: string }> = [
  { value: "OPEN", label: "未着手" },
  { value: "IN_PROGRESS", label: "進行中" },
  { value: "BLOCKED", label: "保留" },
  { value: "DONE", label: "完了" },
];

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

export function toJstDateTimeIso(localDateInput: string, localTimeInput?: string) {
  const normalizedTime = localTimeInput && /^\d{2}:\d{2}$/.test(localTimeInput) ? localTimeInput : "00:00";
  return new Date(`${localDateInput}T${normalizedTime}:00+09:00`).toISOString();
}
