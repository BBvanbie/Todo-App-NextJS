import Link from "next/link";
import type { FormEvent } from "react";
import {
  PRIORITY_OPTIONS,
  STATUS_OPTIONS,
  categoryLabel,
  type TodoCategory,
  type TodoPriority,
  type TodoAssigneeInput,
  type TodoStatus,
} from "./model";

type NewTaskFormProps = {
  title: string;
  startDate: string;
  startTime: string;
  dueDate: string;
  dueTime: string;
  memo: string;
  category: TodoCategory;
  priority: TodoPriority;
  status: TodoStatus;
  assignee: TodoAssigneeInput;
  categoryOptions: string[];
  categoryLabelMap: Record<string, string>;
  backHref: string;
  saving: boolean;
  error: string | null;
  onTitleChange: (value: string) => void;
  onStartDateChange: (value: string) => void;
  onStartTimeChange: (value: string) => void;
  onDueDateChange: (value: string) => void;
  onDueTimeChange: (value: string) => void;
  onMemoChange: (value: string) => void;
  onCategoryChange: (value: TodoCategory) => void;
  onPriorityChange: (value: TodoPriority) => void;
  onStatusChange: (value: TodoStatus) => void;
  onAssigneeChange: (value: TodoAssigneeInput) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function NewTaskForm({
  title,
  startDate,
  startTime,
  dueDate,
  dueTime,
  memo,
  category,
  priority,
  status,
  assignee,
  categoryOptions,
  categoryLabelMap,
  backHref,
  saving,
  error,
  onTitleChange,
  onStartDateChange,
  onStartTimeChange,
  onDueDateChange,
  onDueTimeChange,
  onMemoChange,
  onCategoryChange,
  onPriorityChange,
  onStatusChange,
  onAssigneeChange,
  onSubmit,
}: NewTaskFormProps) {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 min-[768px]:px-8 min-[1024px]:max-w-4xl">
      <section className="glass-card rounded-3xl p-6 md:p-8">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2f5f95]">新規タスク</p>
            <h1 className="mt-1 text-2xl font-bold text-[#132f54]">タスク作成</h1>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/categories"
              className="rounded-lg border border-[#c6d8ee] bg-[#f4f8ff] px-3 py-1 text-xs font-semibold text-[#1e4f86] hover:brightness-95"
            >
              カテゴリ管理
            </Link>
            <Link
              href={backHref}
              className="rounded-lg border border-[#c6d8ee] bg-[#edf5ff] px-3 py-1 text-xs font-semibold text-[#134b99] hover:brightness-95"
            >
              戻る
            </Link>
          </div>
        </div>

        <form onSubmit={onSubmit} className="mt-5 space-y-4">
          <div>
            <label className="mb-1 block text-sm text-muted" htmlFor="title">
              件名
            </label>
            <input
              id="title"
              value={title}
              onChange={(event) => onTitleChange(event.target.value)}
              placeholder="例: 銀行口座の手続き"
              className="w-full rounded-xl border border-[#c9d8ea] bg-white px-3 py-2 text-sm outline-none ring-primary/20 focus:ring-4"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-muted" htmlFor="startDate">
              開始日（任意）
            </label>
            <input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(event) => onStartDateChange(event.target.value)}
              className="w-full rounded-xl border border-[#c9d8ea] bg-white px-3 py-2 text-sm outline-none ring-primary/20 focus:ring-4"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-muted" htmlFor="startTime">
              開始時刻（任意）
            </label>
            <input
              id="startTime"
              type="time"
              value={startTime}
              onChange={(event) => onStartTimeChange(event.target.value)}
              className="w-full rounded-xl border border-[#c9d8ea] bg-white px-3 py-2 text-sm outline-none ring-primary/20 focus:ring-4"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-muted" htmlFor="dueDate">
              期限日付
            </label>
            <input
              id="dueDate"
              type="date"
              value={dueDate}
              onChange={(event) => onDueDateChange(event.target.value)}
              className="w-full rounded-xl border border-[#c9d8ea] bg-white px-3 py-2 text-sm outline-none ring-primary/20 focus:ring-4"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-muted" htmlFor="dueTime">
              期限時刻（任意）
            </label>
            <input
              id="dueTime"
              type="time"
              value={dueTime}
              onChange={(event) => onDueTimeChange(event.target.value)}
              className="w-full rounded-xl border border-[#c9d8ea] bg-white px-3 py-2 text-sm outline-none ring-primary/20 focus:ring-4"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-muted" htmlFor="memo">
              メモ
            </label>
            <textarea
              id="memo"
              value={memo}
              onChange={(event) => onMemoChange(event.target.value)}
              rows={4}
              placeholder="補足メモ（任意）"
              className="w-full rounded-xl border border-[#c9d8ea] bg-white px-3 py-2 text-sm outline-none ring-primary/20 focus:ring-4"
            />
          </div>

          <div className="grid gap-4 min-[768px]:grid-cols-2 min-[1024px]:grid-cols-4">
            <div>
              <label className="mb-1 block text-sm text-muted" htmlFor="category">
                カテゴリ
              </label>
              <select
                id="category"
                value={category}
                onChange={(event) => onCategoryChange(event.target.value as TodoCategory)}
                className="w-full rounded-xl border border-[#c9d8ea] bg-white px-3 py-2 text-sm outline-none ring-primary/20 focus:ring-4"
              >
                {categoryOptions.map((value) => (
                  <option key={value} value={value}>
                    {categoryLabel(value, categoryLabelMap)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm text-muted" htmlFor="priority">
                優先度
              </label>
              <select
                id="priority"
                value={priority}
                onChange={(event) => onPriorityChange(event.target.value as TodoPriority)}
                className="w-full rounded-xl border border-[#c9d8ea] bg-white px-3 py-2 text-sm outline-none ring-primary/20 focus:ring-4"
              >
                {PRIORITY_OPTIONS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm text-muted" htmlFor="status">
                状態
              </label>
              <select
                id="status"
                value={status}
                onChange={(event) => onStatusChange(event.target.value as TodoStatus)}
                className="w-full rounded-xl border border-[#c9d8ea] bg-white px-3 py-2 text-sm outline-none ring-primary/20 focus:ring-4"
              >
                {STATUS_OPTIONS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm text-muted" htmlFor="assignee">
                担当者
              </label>
              <select
                id="assignee"
                value={assignee}
                onChange={(event) => onAssigneeChange(event.target.value as TodoAssigneeInput)}
                className="w-full rounded-xl border border-[#c9d8ea] bg-white px-3 py-2 text-sm outline-none ring-primary/20 focus:ring-4"
              >
                <option value="SELF">自分</option>
                <option value="UNASSIGNED">未設定</option>
              </select>
            </div>
          </div>

          {error && (
            <p className="rounded-xl border border-[#ffd4dc] bg-[#fff4f6] px-4 py-3 text-sm text-[#a31f2b]">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Link
              href={backHref}
              className="rounded-xl border border-[#cfdbeb] px-4 py-2 text-sm text-[#47658a] hover:bg-[#edf5ff]"
            >
              キャンセル
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "作成中..." : "作成"}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
