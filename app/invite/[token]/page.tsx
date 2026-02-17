"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

export default function InviteAcceptPage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const token = params?.token ?? "";
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const acceptInvite = async () => {
    setPending(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/workspaces/invites/${token}/accept`, { method: "POST" });
      if (!res.ok) {
        const body = (await res.json()) as { message?: string };
        throw new Error(body.message ?? "招待の受諾に失敗しました。");
      }
      const body = (await res.json()) as { workspaceId?: string };
      setMessage("参加が完了しました。ホームへ移動します。");
      window.setTimeout(() => {
        const ws = body.workspaceId ? `?ws=${encodeURIComponent(body.workspaceId)}` : "";
        router.push(`/${ws}`);
      }, 800);
    } catch (e) {
      setError(e instanceof Error ? e.message : "招待の受諾に失敗しました。");
    } finally {
      setPending(false);
    }
  };

  return (
    <main className="mx-auto w-full max-w-lg px-4 py-12">
      <section className="glass-card rounded-2xl p-6">
        <h1 className="text-xl font-bold text-[#17355f]">ワークスペース招待</h1>
        <p className="mt-2 text-sm text-[#47688f]">
          受諾するには、招待されたメールアドレスでログインした状態で実行してください。
        </p>

        {message && (
          <p className="mt-4 rounded-lg border border-[#cde8dc] bg-[#effaf5] px-3 py-2 text-sm text-[#2f6d3f]">
            {message}
          </p>
        )}
        {error && (
          <p className="mt-4 rounded-lg border border-[#ffd4dc] bg-[#fff4f6] px-3 py-2 text-sm text-[#a31f2b]">
            {error}
          </p>
        )}

        <div className="mt-5 flex items-center gap-2">
          <button
            type="button"
            onClick={() => void acceptInvite()}
            disabled={pending}
            className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {pending ? "処理中..." : "招待を受諾"}
          </button>
          <Link href="/login" className="rounded-xl border border-[#cfdceb] px-4 py-2 text-sm text-[#335a87]">
            ログインへ
          </Link>
        </div>
      </section>
    </main>
  );
}
