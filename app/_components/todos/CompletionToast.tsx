import type { Todo } from "./model";

type CompletionToastProps = {
  todo: Todo;
  onClose: () => void;
  onCreateNext: () => void;
};

export function CompletionToast({ todo, onClose, onCreateNext }: CompletionToastProps) {
  return (
    <div className="congrats-enter fixed top-4 left-1/2 z-50 w-[min(92vw,420px)] -translate-x-1/2 rounded-2xl border border-[#8bd8b4] bg-[#e8fff2] px-5 py-5 text-center shadow-lg">
      <button
        type="button"
        onClick={onClose}
        className="absolute top-3 right-3 rounded-md border border-[#b8e6d0] px-2 py-1 text-xs"
        aria-label="閉じる"
      >
        ×
      </button>
      <p className="text-lg font-bold text-[#0a6f4f]">完了！🎉</p>
      <p className="mt-1 text-sm text-[#1f7f61]">次回分も作成しますか？</p>
      <p className="mt-1 text-xs text-[#2a7a60]">{todo.title}</p>
      <button
        type="button"
        onClick={onCreateNext}
        className="mx-auto mt-3 inline-flex rounded-xl bg-[#15a272] px-4 py-2 text-sm font-semibold text-white"
      >
        次回分を作成
      </button>
    </div>
  );
}
