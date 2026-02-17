import type { FormEvent } from "react";
import {
  PRIORITY_LABEL,
  STATUS_LABEL,
  categoryLabel,
  type TodoCategory,
  type TodoPriority,
  type TodoStatus,
} from "./model";

type EditTodoModalProps = {
  title: string;
  memo: string;
  startDate: string;
  startTime: string;
  dueDate: string;
  dueTime: string;
  category: TodoCategory;
  priority: TodoPriority;
  status: TodoStatus;
  assignee: "SELF" | "UNASSIGNED";
  categoryOptions: string[];
  categoryLabelMap: Record<string, string>;
  saving: boolean;
  onTitleChange: (value: string) => void;
  onMemoChange: (value: string) => void;
  onStartDateChange: (value: string) => void;
  onStartTimeChange: (value: string) => void;
  onDueDateChange: (value: string) => void;
  onDueTimeChange: (value: string) => void;
  onCategoryChange: (value: TodoCategory) => void;
  onPriorityChange: (value: TodoPriority) => void;
  onStatusChange: (value: TodoStatus) => void;
  onAssigneeChange: (value: "SELF" | "UNASSIGNED") => void;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function EditTodoModal({
  title,
  memo,
  startDate,
  startTime,
  dueDate,
  dueTime,
  category,
  priority,
  status,
  assignee,
  categoryOptions,
  categoryLabelMap,
  saving,
  onTitleChange,
  onMemoChange,
  onStartDateChange,
  onStartTimeChange,
  onDueDateChange,
  onDueTimeChange,
  onCategoryChange,
  onPriorityChange,
  onStatusChange,
  onAssigneeChange,
  onClose,
  onSubmit,
}: EditTodoModalProps) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center overflow-y-auto bg-[#0f1f35]/45 px-4 py-4">
      <div className="glass-card w-full max-w-xl rounded-2xl p-5 max-h-[calc(100dvh-2rem)] overflow-y-auto">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-[#17355f]">タスク編集</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[#cfdbeb] px-2 py-1 text-xs"
          >
            閉じる
          </button>
        </div>
        <form onSubmit={onSubmit} className="space-y-3">
          <label className="block text-sm text-muted" htmlFor="editTitle">
            件名
          </label>
          <input
            id="editTitle"
            value={title}
            onChange={(event) => onTitleChange(event.target.value)}
            className="w-full rounded-xl border border-[#c9d8ea] bg-white px-3 py-2 text-sm"
          />
          <label className="block text-sm text-muted" htmlFor="editStartAtDate">
            開始日（任意）
          </label>
          <input
            id="editStartAtDate"
            type="date"
            value={startDate}
            onChange={(event) => onStartDateChange(event.target.value)}
            className="w-full rounded-xl border border-[#c9d8ea] bg-white px-3 py-2 text-sm"
          />
          <label className="block text-sm text-muted" htmlFor="editStartAtTime">
            開始時刻（任意）
          </label>
          <input
            id="editStartAtTime"
            type="time"
            value={startTime}
            onChange={(event) => onStartTimeChange(event.target.value)}
            className="w-full rounded-xl border border-[#c9d8ea] bg-white px-3 py-2 text-sm"
          />
          <label className="block text-sm text-muted" htmlFor="editDueAtDate">
            期限日付
          </label>
          <input
            id="editDueAtDate"
            type="date"
            value={dueDate}
            onChange={(event) => onDueDateChange(event.target.value)}
            className="w-full rounded-xl border border-[#c9d8ea] bg-white px-3 py-2 text-sm"
          />
          <label className="block text-sm text-muted" htmlFor="editDueAtTime">
            期限時刻（任意）
          </label>
          <input
            id="editDueAtTime"
            type="time"
            value={dueTime}
            onChange={(event) => onDueTimeChange(event.target.value)}
            className="w-full rounded-xl border border-[#c9d8ea] bg-white px-3 py-2 text-sm"
          />
          <label className="block text-sm text-muted" htmlFor="editMemo">
            メモ
          </label>
          <textarea
            id="editMemo"
            value={memo}
            onChange={(event) => onMemoChange(event.target.value)}
            rows={3}
            className="w-full rounded-xl border border-[#c9d8ea] bg-white px-3 py-2 text-sm"
          />
          <div className="grid gap-3 sm:grid-cols-4">
            <div>
              <label className="block text-sm text-muted" htmlFor="editCategory">
                カテゴリ
              </label>
              <select
                id="editCategory"
                value={category}
                onChange={(event) => onCategoryChange(event.target.value as TodoCategory)}
                className="w-full rounded-xl border border-[#c9d8ea] bg-white px-3 py-2 text-sm"
              >
                {categoryOptions.map((value) => (
                  <option key={value} value={value}>
                    {categoryLabel(value, categoryLabelMap)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-muted" htmlFor="editPriority">
                優先度
              </label>
              <select
                id="editPriority"
                value={priority}
                onChange={(event) => onPriorityChange(event.target.value as TodoPriority)}
                className="w-full rounded-xl border border-[#c9d8ea] bg-white px-3 py-2 text-sm"
              >
                {Object.entries(PRIORITY_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-muted" htmlFor="editStatus">
                状態
              </label>
              <select
                id="editStatus"
                value={status}
                onChange={(event) => onStatusChange(event.target.value as TodoStatus)}
                className="w-full rounded-xl border border-[#c9d8ea] bg-white px-3 py-2 text-sm"
              >
                {Object.entries(STATUS_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-muted" htmlFor="editAssignee">
                担当者
              </label>
              <select
                id="editAssignee"
                value={assignee}
                onChange={(event) => onAssigneeChange(event.target.value as "SELF" | "UNASSIGNED")}
                className="w-full rounded-xl border border-[#c9d8ea] bg-white px-3 py-2 text-sm"
              >
                <option value="SELF">自分</option>
                <option value="UNASSIGNED">未設定</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-[#cfdbeb] px-4 py-2 text-sm"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {saving ? "保存中..." : "保存"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
