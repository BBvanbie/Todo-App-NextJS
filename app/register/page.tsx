"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setPending(true);

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, displayName }),
    });

    if (!res.ok) {
      const body = (await res.json().catch(() => ({ message: "登録に失敗しました。" }))) as {
        message?: string;
      };
      setError(body.message ?? "登録に失敗しました。");
      setPending(false);
      return;
    }

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl: "/",
    });

    setPending(false);

    if (!result?.ok) {
      setError("登録は成功しましたが、自動ログインに失敗しました。ログイン画面からお試しください。");
      return;
    }

    window.location.href = result.url ?? "/";
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md items-center px-4 py-10">
      <section className="glass-card w-full rounded-3xl p-6 md:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#2f5f95]">Sign Up</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-[#0f1f35]">アカウント作成</h1>
        <p className="mt-2 text-sm text-muted">作成後は自分のデータだけが表示されます。</p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-[#143459]">
              Email
            </label>
            <input
              id="email"
              type="text"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              className="w-full rounded-xl border border-[#c8d8ea] bg-white px-3 py-2 text-sm"
              required
            />
          </div>

          <div>
            <label htmlFor="displayName" className="mb-1 block text-sm font-medium text-[#143459]">
              表示名 (任意)
            </label>
            <input
              id="displayName"
              type="text"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              className="w-full rounded-xl border border-[#c8d8ea] bg-white px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium text-[#143459]">
              パスワード
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="new-password"
              className="w-full rounded-xl border border-[#c8d8ea] bg-white px-3 py-2 text-sm"
              minLength={8}
              required
            />
          </div>

          {error && (
            <p className="rounded-xl border border-[#ffd4dc] bg-[#fff4f6] px-3 py-2 text-sm text-[#a31f2b]">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {pending ? "作成中..." : "アカウント作成"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-muted">
          すでにアカウントをお持ちですか? <Link href="/login" className="text-[#1b57a6]">ログイン</Link>
        </p>
      </section>
    </main>
  );
}
