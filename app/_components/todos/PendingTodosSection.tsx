import {
  DUE_FILTER_LABEL,
  PRIORITY_LABEL,
  STATUS_LABEL,
  categoryLabel,
  formatDate,
  getCardTone,
  getDueStatus,
  type DueFilter,
  type SelectableCategory,
  type SelectableAssignee,
  type SelectablePriority,
  type SelectableStatus,
  type Todo,
} from "./model";
import { useEffect, useRef, useState } from "react";

type PendingTodosSectionProps = {
  loading: boolean;
  todos: Todo[];
  selectedIds: Set<number>;
  search: string;
  filterCategory: SelectableCategory;
  filterPriority: SelectablePriority;
  filterAssignee: SelectableAssignee;
  filterStatus: SelectableStatus;
  filterDue: DueFilter;
  categoryOptions: string[];
  categoryLabelMap: Record<string, string>;
  onSearchChange: (value: string) => void;
  onFilterCategoryChange: (value: SelectableCategory) => void;
  onFilterPriorityChange: (value: SelectablePriority) => void;
  onFilterAssigneeChange: (value: SelectableAssignee) => void;
  onFilterStatusChange: (value: SelectableStatus) => void;
  onFilterDueChange: (value: DueFilter) => void;
  onToggleSelect: (todoId: number) => void;
  onToggleSelectAll: (checked: boolean) => void;
  onToggle: (todo: Todo) => void;
  onEdit: (todo: Todo) => void;
  onOpenEditHistory: (todo: Todo) => void;
  onDelete: (todo: Todo) => void;
};

export function PendingTodosSection({
  loading,
  todos,
  selectedIds,
  search,
  filterCategory,
  filterPriority,
  filterAssignee,
  filterStatus,
  filterDue,
  categoryOptions,
  categoryLabelMap,
  onSearchChange,
  onFilterCategoryChange,
  onFilterPriorityChange,
  onFilterAssigneeChange,
  onFilterStatusChange,
  onFilterDueChange,
  onToggleSelect,
  onToggleSelectAll,
  onToggle,
  onEdit,
  onOpenEditHistory,
  onDelete,
}: PendingTodosSectionProps) {
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [filterHoverOpen, setFilterHoverOpen] = useState(false);
  const [isPc, setIsPc] = useState(false);
  const filterRootRef = useRef<HTMLDivElement | null>(null);
  const filterOpen = mobileFilterOpen || filterHoverOpen;
  const mobileCategoryOptions: SelectableCategory[] = ["ALL", ...categoryOptions];
  const priorityOptions: SelectablePriority[] = ["ALL", "HIGH", "MEDIUM", "LOW"];
  const assigneeOptions: SelectableAssignee[] = ["ALL", "SELF", "UNASSIGNED"];
  const statusOptions: SelectableStatus[] = ["ALL", "OPEN", "IN_PROGRESS", "BLOCKED", "DONE"];
  const dueOptions: DueFilter[] = ["ALL", "TODAY", "IN_7_DAYS", "OVERDUE"];
  const allSelected = todos.length > 0 && todos.every((todo) => selectedIds.has(todo.id));

  useEffect(() => {
    const media = window.matchMedia("(min-width: 1280px)");
    const apply = () => setIsPc(media.matches);
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (!filterRootRef.current) return;
      const target = event.target as Node;
      if (filterRootRef.current.contains(target)) return;
      setMobileFilterOpen(false);
      setFilterHoverOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setMobileFilterOpen(false);
      setFilterHoverOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  return (
    <section className="mt-6 glass-card rounded-[28px] border border-[#d2e0f0] bg-white/80 p-5 md:p-6">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#567aa3]">Active Zone</p>
          <h2 className="mt-1 text-xl font-bold text-[#122f53]">未完了タスク</h2>
        </div>
        <span className="rounded-full bg-[#e8f2ff] px-3 py-1 text-xs font-semibold text-[#2d619d]">
          {todos.length} 件
        </span>
      </div>
      <div className="mb-3 flex items-center justify-end">
        <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs text-[#3b5f89]">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={(event) => onToggleSelectAll(event.target.checked)}
            className="h-3.5 w-3.5 rounded border-[#aac2dd]"
          />
          表示中をすべて選択
        </label>
      </div>

      <div
        ref={filterRootRef}
        className="mb-2"
        onMouseEnter={() => {
          if (isPc) setFilterHoverOpen(true);
        }}
        onMouseLeave={() => {
          if (isPc) setFilterHoverOpen(false);
        }}
      >
        <button
          type="button"
          onClick={() => {
            setMobileFilterOpen((prev) => !prev);
            setFilterHoverOpen(false);
          }}
          className="flex w-full items-center justify-between rounded-xl border border-[#c9d8ea] bg-white px-3 py-2 text-sm font-semibold text-[#24558f] shadow-[inset_0_1px_0_#ffffff]"
          aria-expanded={filterOpen}
          aria-controls="search-filter-panel"
        >
          <span>検索・絞り込み</span>
          <span>{filterOpen ? "閉じる" : "開く"}</span>
        </button>
      </div>

      <div
        id="search-filter-panel"
        className={`overflow-hidden transition-all duration-300 ${filterOpen ? "mb-4 max-h-[1400px]" : "max-h-0"}`}
      >
        <div className="hidden gap-2 sm:grid-cols-2 md:grid md:grid-cols-6">
          <input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="タイトル・メモで検索"
            className="rounded-xl border border-[#c9d8ea] bg-white px-3 py-2 text-sm shadow-[inset_0_1px_0_#ffffff]"
          />
          <select
            value={filterCategory}
            onChange={(event) => onFilterCategoryChange(event.target.value as SelectableCategory)}
            className="rounded-xl border border-[#c9d8ea] bg-white px-3 py-2 text-sm"
          >
            <option value="ALL">カテゴリ: すべて</option>
            {categoryOptions.map((value) => (
              <option key={value} value={value}>
                {categoryLabel(value, categoryLabelMap)}
              </option>
            ))}
          </select>
          <select
            value={filterPriority}
            onChange={(event) => onFilterPriorityChange(event.target.value as SelectablePriority)}
            className="rounded-xl border border-[#c9d8ea] bg-white px-3 py-2 text-sm"
          >
            <option value="ALL">優先度: すべて</option>
            {Object.entries(PRIORITY_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <select
            value={filterAssignee}
            onChange={(event) => onFilterAssigneeChange(event.target.value as SelectableAssignee)}
            className="rounded-xl border border-[#c9d8ea] bg-white px-3 py-2 text-sm"
          >
            <option value="ALL">担当: すべて</option>
            <option value="SELF">自分</option>
            <option value="UNASSIGNED">未設定</option>
          </select>
          <select
            value={filterStatus}
            onChange={(event) => onFilterStatusChange(event.target.value as SelectableStatus)}
            className="rounded-xl border border-[#c9d8ea] bg-white px-3 py-2 text-sm"
          >
            <option value="ALL">状態: すべて</option>
            {Object.entries(STATUS_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <select
            value={filterDue}
            onChange={(event) => onFilterDueChange(event.target.value as DueFilter)}
            className="rounded-xl border border-[#c9d8ea] bg-white px-3 py-2 text-sm"
          >
            {Object.entries(DUE_FILTER_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                期限: {label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-3 md:hidden">
        <div>
          <input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="タイトル・メモで検索"
            className="w-full rounded-xl border border-[#c9d8ea] bg-white px-3 py-2 text-sm shadow-[inset_0_1px_0_#ffffff]"
          />
        </div>
        <div>
          <p className="mb-1 text-[11px] font-semibold text-[#55779f]">カテゴリ</p>
          <div className="flex flex-wrap gap-1.5">
            {mobileCategoryOptions.map((option) => {
              const active = filterCategory === option;
              const label = option === "ALL" ? "すべて" : categoryLabel(option, categoryLabelMap);
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => onFilterCategoryChange(option)}
                  className={`rounded-full border px-2.5 py-1 text-[11px] ${
                    active
                      ? "border-[#2d67a4] bg-[#e8f1ff] text-[#194d84]"
                      : "border-[#cfdeef] bg-white text-[#47688f]"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <p className="mb-1 text-[11px] font-semibold text-[#55779f]">優先度</p>
          <div className="flex flex-wrap gap-1.5">
            {priorityOptions.map((option) => {
              const active = filterPriority === option;
              const label = option === "ALL" ? "すべて" : PRIORITY_LABEL[option];
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => onFilterPriorityChange(option)}
                  className={`rounded-full border px-2.5 py-1 text-[11px] ${
                    active
                      ? "border-[#2d67a4] bg-[#e8f1ff] text-[#194d84]"
                      : "border-[#cfdeef] bg-white text-[#47688f]"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <p className="mb-1 text-[11px] font-semibold text-[#55779f]">担当者</p>
          <div className="flex flex-wrap gap-1.5">
            {assigneeOptions.map((option) => {
              const active = filterAssignee === option;
              const label = option === "ALL" ? "すべて" : option === "SELF" ? "自分" : "未設定";
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => onFilterAssigneeChange(option)}
                  className={`rounded-full border px-2.5 py-1 text-[11px] ${
                    active
                      ? "border-[#2d67a4] bg-[#e8f1ff] text-[#194d84]"
                      : "border-[#cfdeef] bg-white text-[#47688f]"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <p className="mb-1 text-[11px] font-semibold text-[#55779f]">期限</p>
          <div className="flex flex-wrap gap-1.5">
            {dueOptions.map((option) => {
              const active = filterDue === option;
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => onFilterDueChange(option)}
                  className={`rounded-full border px-2.5 py-1 text-[11px] ${
                    active
                      ? "border-[#2d67a4] bg-[#e8f1ff] text-[#194d84]"
                      : "border-[#cfdeef] bg-white text-[#47688f]"
                  }`}
                >
                  {DUE_FILTER_LABEL[option]}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <p className="mb-1 text-[11px] font-semibold text-[#55779f]">状態</p>
          <div className="flex flex-wrap gap-1.5">
            {statusOptions.map((option) => {
              const active = filterStatus === option;
              const label = option === "ALL" ? "すべて" : STATUS_LABEL[option];
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => onFilterStatusChange(option)}
                  className={`rounded-full border px-2.5 py-1 text-[11px] ${
                    active
                      ? "border-[#2d67a4] bg-[#e8f1ff] text-[#194d84]"
                      : "border-[#cfdeef] bg-white text-[#47688f]"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
        </div>
      </div>

      {loading ? (
        <p className="py-8 text-sm text-muted">読み込み中...</p>
      ) : todos.length === 0 ? (
        <p className="py-8 text-sm text-muted">未完了タスクはありません。</p>
      ) : (
        <ul className="grid grid-cols-1 gap-2.5">
          {todos.map((todo) => {
            const status = getDueStatus(todo.dueAt);
            return (
              <li
                key={todo.id}
                className={`rounded-2xl border p-3 shadow-[0_16px_40px_-36px_#12355d] ${getCardTone(status)}`}
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-start gap-2">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(todo.id)}
                        onChange={() => onToggleSelect(todo.id)}
                        className="mt-0.5 h-4 w-4 shrink-0 rounded border-[#a9c0db]"
                        aria-label={`「${todo.title}」を選択`}
                      />
                      <p className="line-clamp-2 text-sm font-semibold text-[#17355f]">{todo.title}</p>
                    </div>
                    {status === "warning" && (
                      <span className="badge-status-warning shrink-0 rounded-full px-2 py-0.5 text-[10px]">注意</span>
                    )}
                    {status === "danger" && (
                      <span className="badge-status-danger shrink-0 rounded-full px-2 py-0.5 text-[10px]">期限切れ</span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 text-[11px] md:flex md:flex-wrap md:items-center md:gap-2">
                    <div className="rounded-lg bg-[#edf3fa] px-2 py-1 text-[#4e6785]">期限: {formatDate(todo.dueAt)}</div>
                    <div className="rounded-lg bg-[#eaf4ff] px-2 py-1 text-[#215792]">{categoryLabel(todo.category, categoryLabelMap)}</div>
                    <div className="rounded-lg bg-[#f4ecff] px-2 py-1 text-[#61408c]">優先度: {PRIORITY_LABEL[todo.priority]}</div>
                    <div className="rounded-lg bg-[#eef7ef] px-2 py-1 text-[#2f6d3f]">状態: {STATUS_LABEL[todo.status]}</div>
                    <div className="rounded-lg bg-[#fff5ea] px-2 py-1 text-[#8f5a2e]">担当: {todo.assigneeUserId ? "自分" : "未設定"}</div>
                    <button
                      type="button"
                      onClick={() => onToggle(todo)}
                      className="rounded-lg border border-[#7fa5cc] bg-white px-2 py-1 text-left text-[#1b4f86] md:ml-auto md:px-3"
                    >
                      完了にする
                    </button>
                  </div>

                  {todo.memo && <p className="line-clamp-2 text-xs text-[#35557c]">{todo.memo}</p>}

                  <div className="grid grid-cols-3 gap-1.5 md:flex md:justify-end md:gap-2 md:self-end">
                    <button
                      type="button"
                      onClick={() => onEdit(todo)}
                      className="rounded-lg border border-[#c9d7e7] bg-white px-2 py-1 text-[11px] text-[#1e446f] md:min-w-20 md:px-3 md:text-xs"
                    >
                      編集
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpenEditHistory(todo)}
                      className="rounded-lg border border-[#c9d7e7] bg-white px-2 py-1 text-[11px] text-[#1e446f] md:min-w-20 md:px-3 md:text-xs"
                    >
                      履歴
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(todo)}
                      className="rounded-lg border border-[#f1c7cd] bg-[#fff7f8] px-2 py-1 text-[11px] text-[#9b2835] md:min-w-20 md:px-3 md:text-xs"
                    >
                      削除
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
