"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { NewTaskForm } from "@/app/_components/new-task/NewTaskForm";
import {
  toJstMidnightIso,
  type TodoCategory,
  type TodoPriority,
} from "@/app/_components/new-task/model";

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
    if (!title.trim()) return setError("件名は必須です。");
    if (!dueDate) return setError("日付は必須です。");

    setError(null);
    setSaving(true);

    try {
      const res = await fetch("/api/todos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          dueAt: toJstMidnightIso(dueDate),
          memo: memo.trim() || null,
          category,
          priority,
        }),
      });

      if (!res.ok) {
        const body = (await res.json()) as { message?: string };
        throw new Error(body.message ?? "タスク作成に失敗しました。");
      }

      router.push("/");
      router.refresh();
    } catch (e) {
      const message = e instanceof Error ? e.message : "タスク作成に失敗しました。";
      setError(message);
      setSaving(false);
    }
  };

  return (
    <NewTaskForm
      title={title}
      dueDate={dueDate}
      memo={memo}
      category={category}
      priority={priority}
      saving={saving}
      error={error}
      onTitleChange={setTitle}
      onDueDateChange={setDueDate}
      onMemoChange={setMemo}
      onCategoryChange={setCategory}
      onPriorityChange={setPriority}
      onSubmit={handleSubmit}
    />
  );
}
