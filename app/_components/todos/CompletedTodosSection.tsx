import Link from "next/link";
import { formatDate, type Todo } from "./model";

type CompletedTodosSectionProps = {
  todos: Todo[];
  onToggle: (todo: Todo) => void;
  onDelete: (todo: Todo) => void;
};

export function CompletedTodosSection({
  todos,
  onToggle,
  onDelete,
}: CompletedTodosSectionProps) {
  return (
    <section className="mt-5 glass-card rounded-3xl p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[#12325a]">完了タスク</h2>
        <Link
          href="/history"
          className="rounded-lg border border-[#c6d8ee] bg-[#edf5ff] px-3 py-1 text-xs font-semibold text-[#134b99]"
        >
          履歴を見る
        </Link>
      </div>
      {todos.length === 0 ? (
        <p className="py-6 text-sm text-muted">完了タスクはありません。</p>
      ) : (
        <ul className="space-y-3">
          {todos.map((todo) => (
            <li
              key={todo.id}
              className="rounded-2xl border border-[#d0e8df] bg-[#f5fffa] p-3"
            >
              <div className="flex items-start gap-3">
                <button
                  type="button"
                  onClick={() => onToggle(todo)}
                  className="mt-1 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-[#8cd7be] bg-[#16a078] text-white"
                  aria-label={`「${todo.title}」を未完了に戻す`}
                >
                  ✓
                </button>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-[#4a6a60] line-through">{todo.title}</p>
                  <p className="mt-1 text-xs text-[#5f7f74]">期限: {formatDate(todo.dueAt)}</p>
                  <p className="mt-1 text-xs text-[#5f7f74]">
                    完了日: {formatDate(todo.completedAt ?? todo.updatedAt)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onDelete(todo)}
                  className="rounded-lg border border-[#f1c7cd] px-2 py-1 text-xs"
                >
                  削除
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
