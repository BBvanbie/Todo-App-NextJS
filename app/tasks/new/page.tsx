"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { NewTaskForm } from "@/app/_components/new-task/NewTaskForm";
import {
  toJstDateTimeIso,
  type TodoCategory,
  type TodoAssigneeInput,
  type TodoPriority,
  type TodoStatus,
} from "@/app/_components/new-task/model";

type CategoriesResponse = {
  all: string[];
  builtinLabels?: Record<string, string>;
};

function NewTaskPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const workspaceId = searchParams.get("ws");
  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [dueTime, setDueTime] = useState("");
  const [memo, setMemo] = useState("");
  const [categoryOptions, setCategoryOptions] = useState<string[]>(["WORK", "OTHER"]);
  const [categoryLabelMap, setCategoryLabelMap] = useState<Record<string, string>>({
    WORK: "仕事",
    PRIVATE: "プライベート",
    PROCEDURE: "手続き",
    STUDY: "学習",
    HEALTH: "健康",
    SHOPPING: "買い物",
    OTHER: "その他",
  });
  const [category, setCategory] = useState<TodoCategory>("WORK");
  const [priority, setPriority] = useState<TodoPriority>("MEDIUM");
  const [status, setStatus] = useState<TodoStatus>("OPEN");
  const [assignee, setAssignee] = useState<TodoAssigneeInput>("SELF");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchCategories = async () => {
      try {
        const res = await fetch("/api/categories", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as CategoriesResponse;
        if (cancelled) return;
        if (Array.isArray(data.all) && data.all.length > 0) {
          setCategoryOptions(data.all);
          setCategory((current) => (data.all.includes(current) ? current : (data.all[0] ?? "OTHER")));
        }
        if (data.builtinLabels) setCategoryLabelMap(data.builtinLabels);
      } catch {
        // fall back to default options
      }
    };

    void fetchCategories();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!title.trim()) return setError("件名は必須です。");
    if (!dueDate) return setError("期限日付は必須です。");
    if (startTime && !startDate) return setError("開始時刻を指定する場合は開始日も入力してください。");

    if (startDate) {
      const startIso = toJstDateTimeIso(startDate, startTime || undefined);
      const dueIso = toJstDateTimeIso(dueDate, dueTime || undefined);
      if (new Date(startIso).getTime() > new Date(dueIso).getTime()) {
        return setError("開始日時は期限日時以前にしてください。");
      }
    }

    setError(null);
    setSaving(true);

    try {
      const res = await fetch("/api/todos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId,
          title: title.trim(),
          startAt: startDate ? toJstDateTimeIso(startDate, startTime || undefined) : undefined,
          dueAt: toJstDateTimeIso(dueDate, dueTime || undefined),
          memo: memo.trim() || null,
          category,
          priority,
          status,
          assigneeUserId: assignee,
        }),
      });

      if (!res.ok) {
        const body = (await res.json()) as { message?: string };
        throw new Error(body.message ?? "タスク作成に失敗しました。");
      }

      router.push(workspaceId ? `/?ws=${encodeURIComponent(workspaceId)}` : "/");
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
      startDate={startDate}
      startTime={startTime}
      dueDate={dueDate}
      dueTime={dueTime}
      memo={memo}
      category={category}
      priority={priority}
      status={status}
      assignee={assignee}
      categoryOptions={categoryOptions}
      categoryLabelMap={categoryLabelMap}
      backHref={workspaceId ? `/?ws=${encodeURIComponent(workspaceId)}` : "/"}
      saving={saving}
      error={error}
      onTitleChange={setTitle}
      onStartDateChange={setStartDate}
      onStartTimeChange={setStartTime}
      onDueDateChange={setDueDate}
      onDueTimeChange={setDueTime}
      onMemoChange={setMemo}
      onCategoryChange={setCategory}
      onPriorityChange={setPriority}
      onStatusChange={setStatus}
      onAssigneeChange={setAssignee}
      onSubmit={handleSubmit}
    />
  );
}

export default function NewTaskPage() {
  return (
    <Suspense fallback={null}>
      <NewTaskPageContent />
    </Suspense>
  );
}
