import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import Link from "next/link";
import { LoginForm } from "@/app/login/LoginForm";
import { authOptions } from "@/lib/auth-options";

export default async function LoginPage() {
  const session = await getServerSession(authOptions);
  if (session?.user?.id) {
    redirect("/");
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md items-center px-4 py-10">
      <section className="glass-card w-full rounded-3xl p-6 md:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#2f5f95]">
          Authentication
        </p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-[#0f1f35]">ログイン</h1>
        <p className="mt-2 text-sm text-muted">アプリを利用するにはサインインしてください。</p>
        <div className="mt-6">
          <LoginForm />
        </div>
        <p className="mt-4 text-center text-sm text-muted">
          はじめてですか? <Link href="/register" className="text-[#1b57a6]">アカウント作成</Link>
        </p>
      </section>
    </main>
  );
}
