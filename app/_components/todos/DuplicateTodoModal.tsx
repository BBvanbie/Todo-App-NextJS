import type { FormEvent } from "react";
import {
  CATEGORY_LABEL,
  PRIORITY_LABEL,
  type Todo,
  type TodoCategory,
  type TodoPriority,
} from "./model";

type DuplicateTodoModalProps = {
  source: Todo;
  title: string;
  memo: string;
  dueDate: string;
  category: TodoCategory;
  priority: TodoPriority;
  saving: boolean;
  onTitleChange: (value: string) => void;
  onMemoChange: (value: string) => void;
  onDueDateChange: (value: string) => void;
  onCategoryChange: (value: TodoCategory) => void;
  onPriorityChange: (value: TodoPriority) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function DuplicateTodoModal({
  source,
  title,
  memo,
  dueDate,
  category,
  priority,
  saving,
  onTitleChange,
  onMemoChange,
  onDueDateChange,
  onCategoryChange,
  onPriorityChange,
  onClose,
  onSubmit,
}: DuplicateTodoModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f1f35]/45 px-4">
      <div className="glass-card w-full max-w-xl rounded-2xl p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-[#17355f]">次回分を作成</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[#cfdbeb] px-2 py-1 text-xs"
          >
            閉じる
          </button>
        </div>
        <p className="mb-3 text-xs text-muted">元タスク: {source.title}</p>
        <form onSubmit={onSubmit} className="space-y-3">
          <label className="block text-sm text-muted" htmlFor="dupTitle">
            件名
          </label>
          <input
            id="dupTitle"
            value={title}
            onChange={(event) => onTitleChange(event.target.value)}
            className="w-full rounded-xl border border-[#c9d8ea] bg-white px-3 py-2 text-sm"
          />
          <label className="block text-sm text-muted" htmlFor="dupDueDate">
            日付
          </label>
          <input
            id="dupDueDate"
            type="date"
            value={dueDate}
            onChange={(event) => onDueDateChange(event.target.value)}
            className="w-full rounded-xl border border-[#c9d8ea] bg-white px-3 py-2 text-sm"
          />
          <label className="block text-sm text-muted" htmlFor="dupMemo">
            メモ
          </label>
          <textarea
            id="dupMemo"
            value={memo}
            onChange={(event) => onMemoChange(event.target.value)}
            rows={3}
            className="w-full rounded-xl border border-[#c9d8ea] bg-white px-3 py-2 text-sm"
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-sm text-muted" htmlFor="dupCategory">
                カテゴリ
              </label>
              <select
                id="dupCategory"
                value={category}
                onChange={(event) => onCategoryChange(event.target.value as TodoCategory)}
                className="w-full rounded-xl border border-[#c9d8ea] bg-white px-3 py-2 text-sm"
              >
                {Object.entries(CATEGORY_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-muted" htmlFor="dupPriority">
                重要度
              </label>
              <select
                id="dupPriority"
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
              {saving ? "作成中..." : "作成"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
