"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type TodoCategory =
  | "WORK"
  | "PRIVATE"
  | "PROCEDURE"
  | "STUDY"
  | "HEALTH"
  | "SHOPPING"
  | "OTHER";

type TodoPriority = "HIGH" | "MEDIUM" | "LOW";

const CATEGORY_OPTIONS: Array<{ value: TodoCategory; label: string }> = [
  { value: "WORK", label: "Work" },
  { value: "PRIVATE", label: "Private" },
  { value: "PROCEDURE", label: "Procedure" },
  { value: "STUDY", label: "Study" },
  { value: "HEALTH", label: "Health" },
  { value: "SHOPPING", label: "Shopping" },
  { value: "OTHER", label: "Other" },
];

const PRIORITY_OPTIONS: Array<{ value: TodoPriority; label: string }> = [
  { value: "HIGH", label: "High" },
  { value: "MEDIUM", label: "Medium" },
  { value: "LOW", label: "Low" },
];

function toIsoAtNoon(localDateInput: string) {
  return new Date(`${localDateInput}T12:00:00`).toISOString();
}

export default function NewTaskPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [memo, setMemo] = useState("");
  const [category, setCategory] = useState<TodoCategory>("WORK");
  const [priority, setPriority] = useState<TodoPriority>("MEDIUM");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!title.trim()) return setError("Title is required.");
    if (!dueDate) return setError("Due date is required.");

    setError(null);
    setSaving(true);

    try {
      const res = await fetch("/api/todos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          dueAt: toIsoAtNoon(dueDate),
          memo: memo.trim() || null,
          category,
          priority,
        }),
      });

      if (!res.ok) {
        const body = (await res.json()) as { message?: string };
        throw new Error(body.message ?? "Failed to create task.");
      }

      router.push("/");
      router.refresh();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to create task.";
      setError(message);
      setSaving(false);
    }
  };

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 md:px-8">
      <section className="glass-card rounded-3xl p-6 md:p-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2f5f95]">
              New Task
            </p>
            <h1 className="mt-1 text-2xl font-bold text-[#132f54]">Create task</h1>
          </div>
          <Link
            href="/"
            className="rounded-lg border border-[#c6d8ee] bg-[#edf5ff] px-3 py-1 text-xs font-semibold text-[#134b99] hover:brightness-95"
          >
            Back
          </Link>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="mb-1 block text-sm text-muted" htmlFor="title">
              Subject
            </label>
            <input
              id="title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="e.g. Submit estimate to client"
              className="w-full rounded-xl border border-[#c9d8ea] bg-white px-3 py-2 text-sm outline-none ring-primary/20 focus:ring-4"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-muted" htmlFor="dueDate">
              Date
            </label>
            <input
              id="dueDate"
              type="date"
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
              className="w-full rounded-xl border border-[#c9d8ea] bg-white px-3 py-2 text-sm outline-none ring-primary/20 focus:ring-4"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-muted" htmlFor="memo">
              Memo
            </label>
            <textarea
              id="memo"
              value={memo}
              onChange={(event) => setMemo(event.target.value)}
              rows={4}
              placeholder="Optional details..."
              className="w-full rounded-xl border border-[#c9d8ea] bg-white px-3 py-2 text-sm outline-none ring-primary/20 focus:ring-4"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm text-muted" htmlFor="category">
                Category
              </label>
              <select
                id="category"
                value={category}
                onChange={(event) => setCategory(event.target.value as TodoCategory)}
                className="w-full rounded-xl border border-[#c9d8ea] bg-white px-3 py-2 text-sm outline-none ring-primary/20 focus:ring-4"
              >
                {CATEGORY_OPTIONS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm text-muted" htmlFor="priority">
                Priority
              </label>
              <select
                id="priority"
                value={priority}
                onChange={(event) => setPriority(event.target.value as TodoPriority)}
                className="w-full rounded-xl border border-[#c9d8ea] bg-white px-3 py-2 text-sm outline-none ring-primary/20 focus:ring-4"
              >
                {PRIORITY_OPTIONS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {error && (
            <p className="rounded-xl border border-[#ffd4dc] bg-[#fff4f6] px-4 py-3 text-sm text-[#a31f2b]">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Link
              href="/"
              className="rounded-xl border border-[#cfdbeb] px-4 py-2 text-sm text-[#47658a] hover:bg-[#edf5ff]"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Saving..." : "Create"}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
