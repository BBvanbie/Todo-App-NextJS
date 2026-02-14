export type TodoCategory =
  | "WORK"
  | "PRIVATE"
  | "PROCEDURE"
  | "STUDY"
  | "HEALTH"
  | "SHOPPING"
  | "OTHER";

export type TodoPriority = "HIGH" | "MEDIUM" | "LOW";

export const CATEGORY_OPTIONS: Array<{ value: TodoCategory; label: string }> = [
  { value: "WORK", label: "仕事" },
  { value: "PRIVATE", label: "プライベート" },
  { value: "PROCEDURE", label: "手続き" },
  { value: "STUDY", label: "勉強" },
  { value: "HEALTH", label: "健康" },
  { value: "SHOPPING", label: "買い物" },
  { value: "OTHER", label: "その他" },
];

export const PRIORITY_OPTIONS: Array<{ value: TodoPriority; label: string }> = [
  { value: "HIGH", label: "高" },
  { value: "MEDIUM", label: "中" },
  { value: "LOW", label: "低" },
];

export function toJstMidnightIso(localDateInput: string) {
  return new Date(`${localDateInput}T00:00:00+09:00`).toISOString();
}
