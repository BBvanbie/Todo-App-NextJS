import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { ensureAuditLogTable } from "@/lib/audit-log";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { ensureTodoDeletedAtColumn } from "@/lib/todo-soft-delete";

export const dynamic = "force-dynamic";

const CATEGORY_LABEL: Record<string, string> = {
  WORK: "\u4ed5\u4e8b",
  PRIVATE: "\u30d7\u30e9\u30a4\u30d9\u30fc\u30c8",
  PROCEDURE: "\u624b\u7d9a\u304d",
  STUDY: "\u5b66\u7fd2",
  HEALTH: "\u5065\u5eb7",
  SHOPPING: "\u8cb7\u3044\u7269",
  OTHER: "\u305d\u306e\u4ed6",
};

const PRIORITY_LABEL: Record<string, string> = {
  HIGH: "\u9ad8",
  MEDIUM: "\u4e2d",
  LOW: "\u4f4e",
};

const ACTION_LABEL: Record<string, string> = {
  ALL: "\u3059\u3079\u3066",
  TODO_CREATE: "\u4f5c\u6210",
  TODO_UPDATE: "\u66f4\u65b0",
  TODO_COMPLETE: "\u5b8c\u4e86",
  TODO_REOPEN: "\u672a\u5b8c\u4e86\u3078\u623b\u3059",
  TODO_DELETE: "\u524a\u9664",
  TODO_DUPLICATE: "\u8907\u88fd",
};

const ACTION_OPTIONS = [
  "ALL",
  "TODO_CREATE",
  "TODO_UPDATE",
  "TODO_COMPLETE",
  "TODO_REOPEN",
  "TODO_DELETE",
  "TODO_DUPLICATE",
] as const;

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getParam(
  params: Record<string, string | string[] | undefined>,
  key: string,
  fallback = "",
) {
  const value = params[key];
  if (Array.isArray(value)) return value[0] ?? fallback;
  return value ?? fallback;
}

function parsePage(raw: string) {
  const num = Number(raw);
  if (!Number.isInteger(num) || num < 1) return 1;
  return num;
}

function toPrettyJson(value: unknown) {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

type AuditLogRow = {
  id: bigint;
  action: string;
  targetType: string;
  targetId: string;
  requestId: string | null;
  createdAt: Date;
  diffJson: unknown;
};

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) {
    redirect("/login");
  }

  await ensureTodoDeletedAtColumn();
  await ensureAuditLogTable();

  const params = await searchParams;
  const action = getParam(params, "action", "ALL");
  const target = getParam(params, "target", "").trim();
  const requestIdFilter = getParam(params, "requestId", "").trim();
  const page = parsePage(getParam(params, "page", "1"));
  const pageSize = 20;

  const completedTodos = await prisma.$queryRaw<
    Array<{
      id: number;
      title: string;
      memo: string | null;
      category: string;
      priority: string;
      dueAt: Date;
      completedAt: Date | null;
      updatedAt: Date;
    }>
  >`
    SELECT "id", "title", "memo", "category", "priority", "dueAt", "completedAt", "updatedAt"
    FROM "Todo"
    WHERE "userId" = ${userId}
      AND "completed" = true
      AND "deletedAt" IS NULL
    ORDER BY "completedAt" DESC NULLS LAST, "updatedAt" DESC
  `;

  const where: string[] = ['"actorUserId" = $1'];
  const values: unknown[] = [userId];
  const next = (value: unknown) => {
    values.push(value);
    return `$${values.length}`;
  };

  if (ACTION_OPTIONS.includes(action as (typeof ACTION_OPTIONS)[number]) && action !== "ALL") {
    const p = next(action);
    where.push(`"action" = ${p}`);
  }
  if (target) {
    const p = next(`%${target}%`);
    where.push(`"targetId" ILIKE ${p}`);
  }
  if (requestIdFilter) {
    const p = next(`%${requestIdFilter}%`);
    where.push(`COALESCE("requestId", '') ILIKE ${p}`);
  }

  const countRows = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
    `
    SELECT COUNT(*)::bigint AS "count"
    FROM "AuditLog"
    WHERE ${where.join(" AND ")}
    `,
    ...values,
  );
  const totalCount = Number(countRows[0]?.count ?? 0);
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const safePage = Math.min(page, totalPages);
  const safeOffset = (safePage - 1) * pageSize;

  const pageValues = [...values, pageSize, safeOffset];
  const logs = await prisma.$queryRawUnsafe<AuditLogRow[]>(
    `
    SELECT "id", "action", "targetType", "targetId", "requestId", "createdAt", "diffJson"
    FROM "AuditLog"
    WHERE ${where.join(" AND ")}
    ORDER BY "createdAt" DESC
    LIMIT $${pageValues.length - 1}
    OFFSET $${pageValues.length}
    `,
    ...pageValues,
  );

  const baseParams = new URLSearchParams();
  if (action !== "ALL") baseParams.set("action", action);
  if (target) baseParams.set("target", target);
  if (requestIdFilter) baseParams.set("requestId", requestIdFilter);
  const pageHref = (nextPage: number) => {
    const q = new URLSearchParams(baseParams);
    q.set("page", String(nextPage));
    return `/history?${q.toString()}`;
  };

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 min-[768px]:px-8 min-[1280px]:max-w-6xl">
      <section className="glass-card rounded-3xl p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#2f5f95]">
              Completed Archive
            </p>
            <h1 className="mt-1 text-2xl font-bold text-[#132f54]">\u5c65\u6b74</h1>
          </div>
          <Link
            href="/"
            className="rounded-lg border border-[#c6d8ee] bg-[#edf5ff] px-3 py-1 text-xs font-semibold text-[#134b99] hover:brightness-95"
          >
            \u623b\u308b
          </Link>
        </div>
      </section>

      <section className="mt-4 glass-card rounded-3xl p-6">
        {completedTodos.length === 0 ? (
          <p className="text-sm text-muted">\u5b8c\u4e86\u3057\u305f\u30bf\u30b9\u30af\u306f\u307e\u3060\u3042\u308a\u307e\u305b\u3093\u3002</p>
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
                    {"\u512a\u5148\u5ea6: "}{PRIORITY_LABEL[todo.priority] ?? todo.priority}
                  </span>
                </div>
                {todo.memo && <p className="mt-2 text-xs text-[#35557c]">{todo.memo}</p>}
                <p className="mt-1 text-xs text-[#5c7392]">{"\u671f\u9650: "}{formatDate(todo.dueAt)}</p>
                <p className="mt-1 text-xs text-[#5c7392]">
                  {"\u5b8c\u4e86\u65e5: "}{formatDate(todo.completedAt ?? todo.updatedAt)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-4 glass-card rounded-3xl p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-[#17355f]">\u76e3\u67fb\u30ed\u30b0</h2>
          <p className="text-xs text-[#5c7392]">{totalCount}\u4ef6</p>
        </div>

        <form className="mb-4 grid gap-2 min-[1024px]:grid-cols-4">
          <select
            name="action"
            defaultValue={action}
            className="rounded-xl border border-[#c9d8ea] bg-white px-3 py-2 text-sm"
          >
            {ACTION_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {"\u64cd\u4f5c: "}{ACTION_LABEL[option] ?? option}
              </option>
            ))}
          </select>
          <input
            name="target"
            defaultValue={target}
            placeholder="\u5bfe\u8c61ID\u3067\u7d5e\u308a\u8fbc\u307f"
            className="rounded-xl border border-[#c9d8ea] bg-white px-3 py-2 text-sm"
          />
          <input
            name="requestId"
            defaultValue={requestIdFilter}
            placeholder="requestId \u3067\u7d5e\u308a\u8fbc\u307f"
            className="rounded-xl border border-[#c9d8ea] bg-white px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="rounded-xl border border-[#7fa5cc] bg-white px-3 py-2 text-sm font-semibold text-[#1b4f86]"
          >
            \u9069\u7528
          </button>
        </form>

        {logs.length === 0 ? (
          <p className="text-sm text-muted">\u76e3\u67fb\u30ed\u30b0\u306f\u307e\u3060\u3042\u308a\u307e\u305b\u3093\u3002</p>
        ) : (
          <ul className="space-y-2">
            {logs.map((log) => (
              <li key={Number(log.id)} className="rounded-xl border border-[#d4e0ee] bg-white/85 p-3">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-full bg-[#eaf4ff] px-2 py-0.5 text-[#215792]">
                    {ACTION_LABEL[log.action] ?? log.action}
                  </span>
                  <span className="rounded-full bg-[#eef3fa] px-2 py-0.5 text-[#466488]">
                    {log.targetType} #{log.targetId}
                  </span>
                </div>
                <p className="mt-1 text-xs text-[#5c7392]">
                  {"\u5b9f\u884c\u65e5\u6642: "}{formatDateTime(log.createdAt)}
                </p>
                {log.requestId && (
                  <p className="mt-0.5 text-[11px] text-[#7a90ad]">requestId: {log.requestId}</p>
                )}
                {Boolean(log.diffJson) && (
                  <details className="mt-2 rounded-lg border border-[#e1ecf8] bg-[#f8fbff] p-2">
                    <summary className="cursor-pointer text-xs font-semibold text-[#315882]">
                      {"\u5909\u66f4\u5185\u5bb9\u3092\u8868\u793a"}
                    </summary>
                    <pre className="mt-2 overflow-x-auto text-[11px] text-[#2b4768]">
                      {toPrettyJson(log.diffJson)}
                    </pre>
                  </details>
                )}
              </li>
            ))}
          </ul>
        )}

        <div className="mt-4 flex items-center justify-between">
          <p className="text-xs text-[#5c7392]">
            {safePage}/{totalPages} {"\u30da\u30fc\u30b8"}
          </p>
          <div className="flex items-center gap-2">
            {safePage > 1 ? (
              <Link
                href={pageHref(safePage - 1)}
                className="rounded-lg border border-[#c9d8ea] bg-white px-3 py-1.5 text-xs text-[#355b86]"
              >
                {"\u524d\u3078"}
              </Link>
            ) : (
              <span className="rounded-lg border border-[#e2ebf5] bg-[#f8fbff] px-3 py-1.5 text-xs text-[#9ab0c9]">
                {"\u524d\u3078"}
              </span>
            )}
            {safePage < totalPages ? (
              <Link
                href={pageHref(safePage + 1)}
                className="rounded-lg border border-[#c9d8ea] bg-white px-3 py-1.5 text-xs text-[#355b86]"
              >
                {"\u6b21\u3078"}
              </Link>
            ) : (
              <span className="rounded-lg border border-[#e2ebf5] bg-[#f8fbff] px-3 py-1.5 text-xs text-[#9ab0c9]">
                {"\u6b21\u3078"}
              </span>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
