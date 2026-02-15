"use client";

import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setPending(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl: "/",
    });

    setPending(false);

    if (!result?.ok) {
      const message =
        result?.error === "CredentialsSignin"
          ? "email またはパスワードが一致しません。"
          : `ログインに失敗しました: ${result?.error ?? "unknown"}`;
      setError(message);
      return;
    }

    window.location.href = result.url ?? "/";
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
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
        <label htmlFor="password" className="mb-1 block text-sm font-medium text-[#143459]">
          パスワード
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="current-password"
          className="w-full rounded-xl border border-[#c8d8ea] bg-white px-3 py-2 text-sm"
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
        {pending ? "ログイン中..." : "ログイン"}
      </button>
    </form>
  );
}

