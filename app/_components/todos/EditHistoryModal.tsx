import { formatDateTime, type Todo, type TodoEditHistory } from "./model";

type EditHistoryModalProps = {
  todo: Todo;
  histories: TodoEditHistory[];
  loading: boolean;
  onClose: () => void;
};

export function EditHistoryModal({
  todo,
  histories,
  loading,
  onClose,
}: EditHistoryModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f1f35]/45 px-4">
      <div className="glass-card w-full max-w-xl rounded-2xl p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-[#17355f]">
            編集履歴: {todo.title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[#cfdbeb] px-2 py-1 text-xs"
          >
            閉じる
          </button>
        </div>
        {loading ? (
          <p className="text-sm text-muted">読み込み中...</p>
        ) : histories.length === 0 ? (
          <p className="text-sm text-muted">編集履歴はまだありません。</p>
        ) : (
          <ul className="max-h-[50vh] space-y-2 overflow-auto pr-1">
            {histories.map((history, index) => (
              <li
                key={history.id}
                className="rounded-lg border border-[#d8e3f1] bg-white/85 px-3 py-2 text-sm text-[#1b3f6a]"
              >
                {index + 1}. {formatDateTime(history.editedAt)}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
