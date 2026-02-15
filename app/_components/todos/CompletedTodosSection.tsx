import Link from "next/link";
import { formatDate, type Todo } from "./model";

type CompletedTodosSectionProps = {
  todos: Todo[];
  onToggle: (todo: Todo) => void;
  onDelete: (todo: Todo) => void;
};

export function CompletedTodosSection({ todos, onToggle, onDelete }: CompletedTodosSectionProps) {
  return (
    <section className="mt-6 glass-card rounded-[28px] border border-[#cde8dc] bg-[linear-gradient(180deg,#f6fffb_0%,#effaf5_100%)] p-5 md:p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#4a8d76]">Completed Archive</p>
          <h2 className="mt-1 text-xl font-bold text-[#1b4f40]">完了タスク</h2>
        </div>
        <Link
          href="/history"
          className="rounded-lg border border-[#b9dfcf] bg-white px-3 py-1.5 text-xs font-semibold text-[#236852]"
        >
          履歴を見る
        </Link>
      </div>

      {todos.length === 0 ? (
        <p className="py-6 text-sm text-[#557c6f]">完了タスクはまだありません。</p>
      ) : (
        <ul className="grid grid-cols-1 gap-2.5">
          {todos.map((todo) => (
            <li key={todo.id} className="rounded-2xl border border-[#cde8dc] bg-white/85 p-3">
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <p className="line-clamp-2 text-sm text-[#4a6a60] line-through">{todo.title}</p>
                  <span className="shrink-0 rounded-full bg-[#dcf6eb] px-2 py-0.5 text-[10px] font-semibold text-[#1d7a5f]">
                    完了
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                  <div className="rounded-lg bg-[#edf7f2] px-2 py-1 text-[#467564]">期限: {formatDate(todo.dueAt)}</div>
                  <div className="rounded-lg bg-[#edf7f2] px-2 py-1 text-[#467564]">完了日: {formatDate(todo.completedAt ?? todo.updatedAt)}</div>
                </div>

                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => onToggle(todo)}
                    className="rounded-lg border border-[#78c6aa] bg-[#14a174] px-2 py-1 text-[11px] font-semibold text-white"
                    aria-label={`「${todo.title}」を未完了に戻す`}
                  >
                    未完了に戻す
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
          ))}
        </ul>
      )}
    </section>
  );
}
