import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function formatDate(isoString: string) {
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(isoString));
}

export default async function HistoryPage() {
  const completedTodos = await prisma.todo.findMany({
    where: { completed: true },
    orderBy: [{ completedAt: "desc" }, { updatedAt: "desc" }],
  });

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 md:px-8">
      <section className="glass-card rounded-3xl p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#2f5f95]">
              Completed Archive
            </p>
            <h1 className="mt-1 text-2xl font-bold text-[#132f54]">完了履歴</h1>
          </div>
          <Link
            href="/"
            className="rounded-lg border border-[#c6d8ee] bg-[#edf5ff] px-3 py-1 text-xs font-semibold text-[#134b99] hover:brightness-95"
          >
            ダッシュボードへ戻る
          </Link>
        </div>
      </section>

      <section className="mt-4 glass-card rounded-3xl p-6">
        {completedTodos.length === 0 ? (
          <p className="text-sm text-muted">履歴対象の完了タスクはまだありません。</p>
        ) : (
          <ul className="space-y-3">
            {completedTodos.map((todo) => (
              <li
                key={todo.id}
                className="rounded-2xl border border-[#d4e0ee] bg-white/85 p-4"
              >
                <p className="text-sm font-semibold text-[#17355f]">{todo.title}</p>
                <p className="mt-1 text-xs text-[#5c7392]">
                  期限: {formatDate(todo.dueAt.toISOString())}
                </p>
                <p className="mt-1 text-xs text-[#5c7392]">
                  完了: {formatDate((todo.completedAt ?? todo.updatedAt).toISOString())}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
