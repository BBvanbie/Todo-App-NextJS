import type { FormEvent } from "react";
import {
  CATEGORY_LABEL,
  PRIORITY_LABEL,
  type TodoCategory,
  type TodoPriority,
} from "./model";

type EditTodoModalProps = {
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

export function EditTodoModal({
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
}: EditTodoModalProps) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#0f1f35]/45 px-4">
      <div className="glass-card w-full max-w-xl rounded-2xl p-5">
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
          <label className="block text-sm text-muted" htmlFor="editDueAt">
            日付
          </label>
          <input
            id="editDueAt"
            type="date"
            value={dueDate}
            onChange={(event) => onDueDateChange(event.target.value)}
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
          <div className="grid gap-3 sm:grid-cols-2">
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
                {Object.entries(CATEGORY_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-muted" htmlFor="editPriority">
                重要度
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
