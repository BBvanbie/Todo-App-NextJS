import {
  CATEGORY_LABEL,
  DUE_FILTER_LABEL,
  PRIORITY_LABEL,
  formatDate,
  getCardTone,
  getDueStatus,
  type DueFilter,
  type SelectableCategory,
  type SelectablePriority,
  type Todo,
} from "./model";

type PendingTodosSectionProps = {
  loading: boolean;
  todos: Todo[];
  search: string;
  filterCategory: SelectableCategory;
  filterPriority: SelectablePriority;
  filterDue: DueFilter;
  onSearchChange: (value: string) => void;
  onFilterCategoryChange: (value: SelectableCategory) => void;
  onFilterPriorityChange: (value: SelectablePriority) => void;
  onFilterDueChange: (value: DueFilter) => void;
  onToggle: (todo: Todo) => void;
  onEdit: (todo: Todo) => void;
  onOpenEditHistory: (todo: Todo) => void;
  onDelete: (todo: Todo) => void;
};

export function PendingTodosSection({
  loading,
  todos,
  search,
  filterCategory,
  filterPriority,
  filterDue,
  onSearchChange,
  onFilterCategoryChange,
  onFilterPriorityChange,
  onFilterDueChange,
  onToggle,
  onEdit,
  onOpenEditHistory,
  onDelete,
}: PendingTodosSectionProps) {
  const categoryOptions: SelectableCategory[] = [
    "ALL",
    "WORK",
    "PRIVATE",
    "PROCEDURE",
    "STUDY",
    "HEALTH",
    "SHOPPING",
    "OTHER",
  ];
  const priorityOptions: SelectablePriority[] = ["ALL", "HIGH", "MEDIUM", "LOW"];
  const dueOptions: DueFilter[] = ["ALL", "TODAY", "IN_7_DAYS", "OVERDUE"];

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

      <div className="mb-2 md:hidden">
        <input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="タイトル・メモで検索"
          className="rounded-xl border border-[#c9d8ea] bg-white px-3 py-2 text-sm shadow-[inset_0_1px_0_#ffffff]"
        />
      </div>

      <div className="mb-4 hidden gap-2 sm:grid-cols-2 md:grid md:grid-cols-4">
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
          {Object.entries(CATEGORY_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
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

      <div className="mb-4 space-y-3 md:hidden">
        <div>
          <p className="mb-1 text-[11px] font-semibold text-[#55779f]">カテゴリ</p>
          <div className="flex flex-wrap gap-1.5">
            {categoryOptions.map((option) => {
              const active = filterCategory === option;
              const label = option === "ALL" ? "すべて" : CATEGORY_LABEL[option];
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
                    <p className="line-clamp-2 text-sm font-semibold text-[#17355f]">{todo.title}</p>
                    {status === "warning" && (
                      <span className="badge-status-warning shrink-0 rounded-full px-2 py-0.5 text-[10px]">注意</span>
                    )}
                    {status === "danger" && (
                      <span className="badge-status-danger shrink-0 rounded-full px-2 py-0.5 text-[10px]">期限切れ</span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                    <div className="rounded-lg bg-[#edf3fa] px-2 py-1 text-[#4e6785]">期限: {formatDate(todo.dueAt)}</div>
                    <div className="rounded-lg bg-[#eaf4ff] px-2 py-1 text-[#215792]">{CATEGORY_LABEL[todo.category]}</div>
                    <div className="rounded-lg bg-[#f4ecff] px-2 py-1 text-[#61408c]">優先度: {PRIORITY_LABEL[todo.priority]}</div>
                    <button
                      type="button"
                      onClick={() => onToggle(todo)}
                      className="rounded-lg border border-[#7fa5cc] bg-white px-2 py-1 text-left text-[#1b4f86]"
                    >
                      完了にする
                    </button>
                  </div>

                  {todo.memo && <p className="line-clamp-2 text-xs text-[#35557c]">{todo.memo}</p>}

                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() => onEdit(todo)}
                      className="rounded-lg border border-[#c9d7e7] bg-white px-2 py-1 text-[11px] text-[#1e446f]"
                    >
                      編集
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpenEditHistory(todo)}
                      className="rounded-lg border border-[#c9d7e7] bg-white px-2 py-1 text-[11px] text-[#1e446f]"
                    >
                      履歴
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(todo)}
                      className="rounded-lg border border-[#f1c7cd] bg-[#fff7f8] px-2 py-1 text-[11px] text-[#9b2835]"
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
