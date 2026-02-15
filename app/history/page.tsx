import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const CATEGORY_LABEL: Record<string, string> = {
  WORK: "仕事",
  PRIVATE: "プライベート",
  PROCEDURE: "手続き",
  STUDY: "学習",
  HEALTH: "健康",
  SHOPPING: "買い物",
  OTHER: "その他",
};

const PRIORITY_LABEL: Record<string, string> = {
  HIGH: "高",
  MEDIUM: "中",
  LOW: "低",
};

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export default async function HistoryPage() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) {
    redirect("/login");
  }

  const completedTodos = await prisma.todo.findMany({
    where: { completed: true, userId },
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
            <h1 className="mt-1 text-2xl font-bold text-[#132f54]">履歴</h1>
          </div>
          <Link
            href="/"
            className="rounded-lg border border-[#c6d8ee] bg-[#edf5ff] px-3 py-1 text-xs font-semibold text-[#134b99] hover:brightness-95"
          >
            戻る
          </Link>
        </div>
      </section>

      <section className="mt-4 glass-card rounded-3xl p-6">
        {completedTodos.length === 0 ? (
          <p className="text-sm text-muted">完了したタスクはまだありません。</p>
        ) : (
          <ul className="space-y-3">
            {completedTodos.map((todo) => (
              <li key={todo.id} className="rounded-2xl border border-[#d4e0ee] bg-white/85 p-4">
                <p className="text-sm font-semibold text-[#17355f]">{todo.title}</p>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-full bg-[#eaf4ff] px-2 py-0.5 text-[#215792]">
                    {CATEGORY_LABEL[todo.category] ?? todo.category}
                  </span>
                  <span className="rounded-full bg-[#f4ecff] px-2 py-0.5 text-[#61408c]">
                    優先度: {PRIORITY_LABEL[todo.priority] ?? todo.priority}
                  </span>
                </div>
                {todo.memo && <p className="mt-2 text-xs text-[#35557c]">{todo.memo}</p>}
                <p className="mt-1 text-xs text-[#5c7392]">期限: {formatDate(todo.dueAt)}</p>
                <p className="mt-1 text-xs text-[#5c7392]">
                  完了日: {formatDate(todo.completedAt ?? todo.updatedAt)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
