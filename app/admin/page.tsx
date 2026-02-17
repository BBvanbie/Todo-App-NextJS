import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type UserSummaryRow = {
  id: string;
  email: string;
  displayName: string | null;
  role: "ADMIN" | "USER";
  todoCount: bigint;
  completedCount: bigint;
};

type AdminSummaryRow = {
  totalUsers: bigint;
  adminUsers: bigint;
  totalTodos: bigint;
  completedTodos: bigint;
  dueSoonTodos: bigint;
  unreadNotifications: bigint;
};

type RecentTodoRow = {
  id: number;
  title: string;
  email: string;
  dueAt: Date;
  completed: boolean;
  createdAt: Date;
};

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value);
}

function toNumber(value: bigint) {
  return Number(value ?? BigInt(0));
}

export default async function AdminPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/login");
  }
  if (session.user.role !== "ADMIN") {
    redirect("/");
  }

  const [summaryRows, users, recentTodos] = await Promise.all([
    prisma.$queryRaw<AdminSummaryRow[]>`
      SELECT
        (SELECT COUNT(*)::bigint FROM "User") AS "totalUsers",
        (SELECT COUNT(*)::bigint FROM "User" WHERE COALESCE("role"::text, 'USER') = 'ADMIN') AS "adminUsers",
        (SELECT COUNT(*)::bigint FROM "Todo") AS "totalTodos",
        (SELECT COUNT(*)::bigint FROM "Todo" WHERE "completed" = true) AS "completedTodos",
        (
          SELECT COUNT(*)::bigint
          FROM "Todo"
          WHERE "completed" = false
            AND "dueAt" <= NOW() + INTERVAL '3 day'
        ) AS "dueSoonTodos",
        (
          SELECT COUNT(*)::bigint
          FROM "Notification"
          WHERE "readAt" IS NULL
        ) AS "unreadNotifications"
    `,
    prisma.$queryRaw<UserSummaryRow[]>`
      SELECT
        u."id",
        u."email",
        u."displayName",
        COALESCE(u."role"::text, 'USER') AS "role",
        COUNT(t."id")::bigint AS "todoCount",
        COUNT(CASE WHEN t."completed" = true THEN 1 END)::bigint AS "completedCount"
      FROM "User" u
      LEFT JOIN "Todo" t ON t."userId" = u."id"
      GROUP BY u."id", u."email", u."displayName", u."role"
      ORDER BY u."createdAt" DESC
    `,
    prisma.$queryRaw<RecentTodoRow[]>`
      SELECT
        t."id",
        t."title",
        u."email",
        t."dueAt",
        t."completed",
        t."createdAt"
      FROM "Todo" t
      LEFT JOIN "User" u ON u."id" = t."userId"
      ORDER BY t."createdAt" DESC
      LIMIT 8
    `,
  ]);

  const summary = summaryRows[0];
  const metricCards = [
    { label: "総ユーザー", value: toNumber(summary.totalUsers), note: `管理者 ${toNumber(summary.adminUsers)} 名` },
    { label: "Todo総数", value: toNumber(summary.totalTodos), note: `完了 ${toNumber(summary.completedTodos)} 件` },
    { label: "3日以内期限", value: toNumber(summary.dueSoonTodos), note: "未完了タスク" },
    { label: "未読通知", value: toNumber(summary.unreadNotifications), note: "全ユーザー合計" },
  ];

  return (
    <main className="relative mx-auto w-full max-w-6xl overflow-hidden px-4 py-8 min-[768px]:px-8 min-[768px]:py-10">
      <div className="pointer-events-none absolute -left-28 top-0 h-72 w-72 rounded-full bg-[radial-gradient(circle,#9ad3ff_0%,#9ad3ff00_70%)]" />
      <div className="pointer-events-none absolute -right-24 top-16 h-80 w-80 rounded-full bg-[radial-gradient(circle,#b8ffd8_0%,#b8ffd800_68%)]" />

      <section className="relative overflow-hidden rounded-3xl border border-[#c4d9f2] bg-[linear-gradient(130deg,#0f2d53_0%,#123b72_48%,#245ea0_100%)] p-7 text-white shadow-[0_24px_60px_-30px_#0f2d5399] md:p-8">
        <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full border border-white/20" />
        <div className="absolute bottom-2 right-8 h-20 w-20 rounded-full border border-white/15" />

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#b9d9ff]">Admin Console</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">管理者ダッシュボード</h1>
            <p className="mt-2 text-sm text-[#d8e8ff] md:text-base">
              全ユーザーの運用状況をここで確認できます。一般ユーザーには表示されません。
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/"
              className="rounded-xl border border-white/30 bg-white/10 px-4 py-2 text-sm font-semibold text-white backdrop-blur hover:bg-white/20"
            >
              ホームへ戻る
            </Link>
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-4 min-[768px]:grid-cols-2 min-[1024px]:grid-cols-4">
        {metricCards.map((card) => (
          <article
            key={card.label}
            className="glass-card rounded-2xl border border-[#d3e2f3] bg-white/90 p-4 shadow-[0_20px_50px_-40px_#12355d]"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#55779f]">{card.label}</p>
            <p className="mt-2 text-3xl font-bold leading-none text-[#12345b]">{card.value}</p>
            <p className="mt-2 text-xs text-[#5d7797]">{card.note}</p>
          </article>
        ))}
      </section>

      <section className="mt-6 grid gap-4 min-[1024px]:grid-cols-[1.5fr_1fr]">
        <article className="glass-card rounded-3xl p-5 md:p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-[#12345b]">ユーザー別アクティビティ</h2>
            <span className="rounded-full bg-[#e9f2ff] px-3 py-1 text-xs font-semibold text-[#2b5f99]">
              {users.length} users
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-[#d8e4f3] text-left text-[#416893]">
                  <th className="px-2 py-2">メールアドレス</th>
                  <th className="px-2 py-2">表示名</th>
                  <th className="px-2 py-2">ロール</th>
                  <th className="px-2 py-2">Todo総数</th>
                  <th className="px-2 py-2">完了数</th>
                </tr>
              </thead>
              <tbody>
                {users.map((row) => {
                  const roleIsAdmin = row.role === "ADMIN";
                  return (
                    <tr key={row.id} className="border-b border-[#edf3fa] text-[#17355f]">
                      <td className="px-2 py-2 font-medium">{row.email}</td>
                      <td className="px-2 py-2">{row.displayName ?? "-"}</td>
                      <td className="px-2 py-2">
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-semibold ${
                            roleIsAdmin
                              ? "bg-[#ffe8d7] text-[#a75400]"
                              : "bg-[#eaf5ff] text-[#245c98]"
                          }`}
                        >
                          {row.role === "ADMIN" ? "管理者" : "一般"}
                        </span>
                      </td>
                      <td className="px-2 py-2">{toNumber(row.todoCount)}</td>
                      <td className="px-2 py-2">{toNumber(row.completedCount)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </article>

        <article className="glass-card rounded-3xl p-5 md:p-6">
          <h2 className="text-lg font-bold text-[#12345b]">最新のTodo登録</h2>
          <ul className="mt-4 space-y-3">
            {recentTodos.map((todo) => (
              <li key={todo.id} className="rounded-2xl border border-[#d8e4f2] bg-white/75 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-[#12345b]">{todo.title}</p>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      todo.completed ? "bg-[#ddf7ee] text-[#116f53]" : "bg-[#fff0d9] text-[#9b5c07]"
                    }`}
                  >
                    {todo.completed ? "完了" : "進行中"}
                  </span>
                </div>
                <p className="mt-1 text-xs text-[#567596]">作成者: {todo.email ?? "(未割当)"}</p>
                <p className="mt-1 text-xs text-[#567596]">
                  期限: {formatDate(todo.dueAt)} / 作成: {formatDate(todo.createdAt)}
                </p>
              </li>
            ))}
          </ul>
        </article>
      </section>
    </main>
  );
}
