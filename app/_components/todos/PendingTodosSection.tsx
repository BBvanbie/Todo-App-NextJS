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
  return (
    <section className="mt-5 glass-card rounded-3xl p-5">
      <div className="mb-3 grid gap-2 sm:grid-cols-2 md:grid-cols-4">
        <input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="件名・メモで検索"
          className="rounded-xl border border-[#c9d8ea] bg-white px-3 py-2 text-sm"
        />
        <select
          value={filterCategory}
          onChange={(event) =>
            onFilterCategoryChange(event.target.value as SelectableCategory)
          }
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
          onChange={(event) =>
            onFilterPriorityChange(event.target.value as SelectablePriority)
          }
          className="rounded-xl border border-[#c9d8ea] bg-white px-3 py-2 text-sm"
        >
          <option value="ALL">重要度: すべて</option>
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

      {loading ? (
        <p className="py-8 text-sm text-muted">読み込み中...</p>
      ) : todos.length === 0 ? (
        <p className="py-8 text-sm text-muted">未完了タスクはありません。</p>
      ) : (
        <ul className="space-y-3">
          {todos.map((todo) => {
            const status = getDueStatus(todo.dueAt);
            return (
              <li
                key={todo.id}
                className={`rounded-2xl border p-3 shadow-[0_8px_20px_-20px_#0d315f] ${getCardTone(status)}`}
              >
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    onClick={() => onToggle(todo)}
                    className="mt-1 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-[#9fb5cd]"
                    aria-label={`「${todo.title}」を完了にする`}
                  >
                    □
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-[#17355f]">
                      {todo.title}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                      <span className="rounded-full bg-[#edf3fa] px-2 py-0.5 text-[#4e6785]">
                        期限: {formatDate(todo.dueAt)}
                      </span>
                      <span className="rounded-full bg-[#eaf4ff] px-2 py-0.5 text-[#215792]">
                        {CATEGORY_LABEL[todo.category]}
                      </span>
                      <span className="rounded-full bg-[#f4ecff] px-2 py-0.5 text-[#61408c]">
                        重要度: {PRIORITY_LABEL[todo.priority]}
                      </span>
                      {status === "warning" && (
                        <span className="badge-status-warning rounded-full px-2 py-0.5">
                          注意: 期限まで7日以内
                        </span>
                      )}
                      {status === "danger" && (
                        <span className="badge-status-danger rounded-full px-2 py-0.5">
                          警告: 期限切れ
                        </span>
                      )}
                    </div>
                    {todo.memo && (
                      <p className="mt-2 line-clamp-2 text-xs text-[#35557c]">
                        {todo.memo}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button
                      type="button"
                      onClick={() => onEdit(todo)}
                      className="rounded-lg border border-[#c9d7e7] px-2 py-1 text-xs"
                    >
                      編集
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpenEditHistory(todo)}
                      className="rounded-lg border border-[#c9d7e7] px-2 py-1 text-xs"
                    >
                      編集履歴
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(todo)}
                      className="rounded-lg border border-[#f1c7cd] px-2 py-1 text-xs"
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
