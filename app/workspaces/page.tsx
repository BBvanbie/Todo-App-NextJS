"use client";

import Link from "next/link";
import { FormEvent, Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

type WorkspaceRole = "OWNER" | "MEMBER";
type WorkspaceOption = { id: string; name: string; isPersonal: boolean; role: WorkspaceRole };
type WorkspaceMember = { userId: string; role: WorkspaceRole; email: string; displayName: string | null };
type WorkspaceInvite = {
  id: string;
  email: string;
  invitedByUserId: string;
  inviterDisplayName: string | null;
  inviterEmail: string | null;
  expiresAt: string;
  acceptedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
};

type InviteCreateResponse = {
  inviteId: string;
  email: string;
  inviteUrl: string;
  expiresAt: string;
  mailStatus: "sent" | "failed" | "skipped";
  mailError: string | null;
};

async function getApiErrorMessage(response: Response, fallback: string) {
  try {
    const body = (await response.json()) as { message?: string };
    return body.message ?? fallback;
  } catch {
    return fallback;
  }
}

function formatDateTime(value: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("ja-JP");
}

function WorkspaceManagePageContent() {
  const searchParams = useSearchParams();
  const initialWs = searchParams.get("ws");

  const [workspaces, setWorkspaces] = useState<WorkspaceOption[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [invites, setInvites] = useState<WorkspaceInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const [renameValue, setRenameValue] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [savingCreate, setSavingCreate] = useState(false);
  const [savingRename, setSavingRename] = useState(false);
  const [savingInvite, setSavingInvite] = useState(false);
  const [lastInviteResult, setLastInviteResult] = useState<InviteCreateResponse | null>(null);

  const activeWorkspace = useMemo(
    () => workspaces.find((workspace) => workspace.id === activeWorkspaceId) ?? null,
    [workspaces, activeWorkspaceId],
  );
  const isOwner = activeWorkspace?.role === "OWNER";
  const homeHref = activeWorkspaceId ? `/?ws=${encodeURIComponent(activeWorkspaceId)}` : "/";

  useEffect(() => {
    let cancelled = false;
    const fetchWorkspaces = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/workspaces", { cache: "no-store" });
        if (!res.ok) {
          throw new Error(await getApiErrorMessage(res, "ワークスペース一覧の取得に失敗しました。"));
        }
        const data = (await res.json()) as WorkspaceOption[];
        if (cancelled) return;
        setWorkspaces(data);
        const selected =
          (initialWs && data.some((w) => w.id === initialWs) ? initialWs : data[0]?.id) ?? null;
        setActiveWorkspaceId(selected);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "ワークスペース一覧の取得に失敗しました。");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void fetchWorkspaces();
    return () => {
      cancelled = true;
    };
  }, [initialWs]);

  useEffect(() => {
    setRenameValue(activeWorkspace?.name ?? "");
  }, [activeWorkspace?.name]);

  useEffect(() => {
    if (!activeWorkspaceId) {
      setMembers([]);
      setInvites([]);
      return;
    }
    let cancelled = false;
    const fetchDetails = async () => {
      setDetailLoading(true);
      setError(null);
      try {
        const [memberRes, inviteRes] = await Promise.all([
          fetch(`/api/workspaces/${activeWorkspaceId}/members`, { cache: "no-store" }),
          fetch(`/api/workspaces/${activeWorkspaceId}/invites`, { cache: "no-store" }),
        ]);
        if (!memberRes.ok) {
          throw new Error(await getApiErrorMessage(memberRes, "メンバー一覧の取得に失敗しました。"));
        }
        if (!inviteRes.ok) {
          throw new Error(await getApiErrorMessage(inviteRes, "招待一覧の取得に失敗しました。"));
        }
        const memberBody = (await memberRes.json()) as WorkspaceMember[];
        const inviteBody = (await inviteRes.json()) as WorkspaceInvite[];
        if (cancelled) return;
        setMembers(memberBody);
        setInvites(inviteBody);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "ワークスペース詳細の取得に失敗しました。");
      } finally {
        if (!cancelled) setDetailLoading(false);
      }
    };
    void fetchDetails();
    return () => {
      cancelled = true;
    };
  }, [activeWorkspaceId]);

  const refreshInvites = async () => {
    if (!activeWorkspaceId) return;
    const res = await fetch(`/api/workspaces/${activeWorkspaceId}/invites`, { cache: "no-store" });
    if (!res.ok) throw new Error(await getApiErrorMessage(res, "招待一覧の更新に失敗しました。"));
    setInvites((await res.json()) as WorkspaceInvite[]);
  };

  const handleCreateWorkspace = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!newWorkspaceName.trim()) return;
    setSavingCreate(true);
    setError(null);
    try {
      const res = await fetch("/api/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newWorkspaceName.trim() }),
      });
      if (!res.ok) throw new Error(await getApiErrorMessage(res, "ワークスペース作成に失敗しました。"));
      const created = (await res.json()) as WorkspaceOption;
      setWorkspaces((current) => [...current, created]);
      setActiveWorkspaceId(created.id);
      setNewWorkspaceName("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "ワークスペース作成に失敗しました。");
    } finally {
      setSavingCreate(false);
    }
  };

  const handleRenameWorkspace = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!activeWorkspaceId || !renameValue.trim()) return;
    setSavingRename(true);
    setError(null);
    try {
      const res = await fetch(`/api/workspaces/${activeWorkspaceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: renameValue.trim() }),
      });
      if (!res.ok) throw new Error(await getApiErrorMessage(res, "ワークスペース名変更に失敗しました。"));
      const body = (await res.json()) as { id: string; name: string };
      setWorkspaces((current) =>
        current.map((workspace) =>
          workspace.id === body.id ? { ...workspace, name: body.name } : workspace,
        ),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "ワークスペース名変更に失敗しました。");
    } finally {
      setSavingRename(false);
    }
  };

  const handleSendInvite = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!activeWorkspaceId || !inviteEmail.trim()) return;
    setSavingInvite(true);
    setError(null);
    setLastInviteResult(null);
    try {
      const res = await fetch(`/api/workspaces/${activeWorkspaceId}/invites`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail.trim().toLowerCase() }),
      });
      if (!res.ok) throw new Error(await getApiErrorMessage(res, "招待送信に失敗しました。"));
      const body = (await res.json()) as InviteCreateResponse;
      setInviteEmail("");
      setLastInviteResult(body);
      await refreshInvites();
    } catch (e) {
      setError(e instanceof Error ? e.message : "招待送信に失敗しました。");
    } finally {
      setSavingInvite(false);
    }
  };

  const handleRevokeInvite = async (inviteId: string) => {
    if (!activeWorkspaceId) return;
    setError(null);
    try {
      const res = await fetch(`/api/workspaces/${activeWorkspaceId}/invites/${inviteId}/revoke`, {
        method: "POST",
      });
      if (!res.ok) throw new Error(await getApiErrorMessage(res, "招待取り消しに失敗しました。"));
      await refreshInvites();
    } catch (e) {
      setError(e instanceof Error ? e.message : "招待取り消しに失敗しました。");
    }
  };

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 min-[768px]:px-8 min-[1280px]:py-8">
      <section className="mb-5 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#5b7ea5]">Workspace</p>
          <h1 className="text-2xl font-bold text-[#14355d]">Workspace管理</h1>
        </div>
        <Link href={homeHref} className="rounded-lg border border-[#cad9ea] bg-white px-3 py-1.5 text-xs font-semibold text-[#2f5889]">
          ホームへ戻る
        </Link>
      </section>

      {loading ? (
        <p className="rounded-xl border border-[#d7e5f5] bg-white/85 px-4 py-3 text-sm text-[#557493]">読み込み中...</p>
      ) : (
        <div className="grid gap-4 min-[1024px]:grid-cols-[320px_1fr]">
          <section className="rounded-2xl border border-[#d3e2f3] bg-white p-4">
            <h2 className="text-sm font-semibold text-[#17355f]">Workspace一覧</h2>
            <div className="mt-3 space-y-2">
              {workspaces.map((workspace) => (
                <button
                  key={workspace.id}
                  type="button"
                  onClick={() => setActiveWorkspaceId(workspace.id)}
                  className={`w-full rounded-lg border px-3 py-2 text-left text-sm ${
                    workspace.id === activeWorkspaceId
                      ? "border-[#75a9de] bg-[#edf6ff] text-[#14355d]"
                      : "border-[#d6e3f2] bg-white text-[#2c517a]"
                  }`}
                >
                  <p className="font-semibold">{workspace.name}</p>
                  <p className="mt-0.5 text-xs opacity-80">
                    {workspace.isPersonal ? "個人" : "共有"} / {workspace.role}
                  </p>
                </button>
              ))}
            </div>

            <form onSubmit={handleCreateWorkspace} className="mt-4 border-t border-[#e6eef8] pt-4">
              <p className="text-xs font-semibold text-[#52739a]">新規共有Workspace作成</p>
              <input
                value={newWorkspaceName}
                onChange={(event) => setNewWorkspaceName(event.target.value)}
                placeholder="Workspace名"
                className="mt-2 w-full rounded-lg border border-[#cad9ea] px-3 py-2 text-sm"
              />
              <button
                type="submit"
                disabled={savingCreate || !newWorkspaceName.trim()}
                className="mt-2 w-full rounded-lg bg-[#1d5da8] px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {savingCreate ? "作成中..." : "作成する"}
              </button>
            </form>
          </section>

          <section className="rounded-2xl border border-[#d3e2f3] bg-white p-4">
            {!activeWorkspace ? (
              <p className="text-sm text-[#5d7898]">Workspaceがありません。</p>
            ) : (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-xs text-[#6081a3]">選択中</p>
                    <h2 className="text-lg font-semibold text-[#14355d]">{activeWorkspace.name}</h2>
                  </div>
                  <span className="rounded-full border border-[#d4e3f4] bg-[#f6fbff] px-3 py-1 text-xs text-[#315b86]">
                    権限: {activeWorkspace.role}
                  </span>
                </div>

                <form onSubmit={handleRenameWorkspace} className="mt-4 grid gap-2 min-[768px]:grid-cols-[1fr_auto]">
                  <input
                    value={renameValue}
                    onChange={(event) => setRenameValue(event.target.value)}
                    placeholder="Workspace名を変更"
                    className="rounded-lg border border-[#cad9ea] px-3 py-2 text-sm"
                  />
                  <button
                    type="submit"
                    disabled={savingRename || !renameValue.trim()}
                    className="rounded-lg border border-[#9ac0e5] bg-[#edf6ff] px-3 py-2 text-sm font-semibold text-[#1f4f86] disabled:opacity-60"
                  >
                    {savingRename ? "保存中..." : "名称変更"}
                  </button>
                </form>

                {isOwner && (
                  <form onSubmit={handleSendInvite} className="mt-4 rounded-xl border border-[#dce8f6] bg-[#fbfdff] p-3">
                    <p className="text-xs font-semibold text-[#52739a]">メンバー招待（OWNERのみ）</p>
                    <div className="mt-2 grid gap-2 min-[768px]:grid-cols-[1fr_auto]">
                      <input
                        type="email"
                        value={inviteEmail}
                        onChange={(event) => setInviteEmail(event.target.value)}
                        placeholder="invite@example.com"
                        className="rounded-lg border border-[#cad9ea] px-3 py-2 text-sm"
                      />
                      <button
                        type="submit"
                        disabled={savingInvite || !inviteEmail.trim()}
                        className="rounded-lg bg-[#1d5da8] px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
                      >
                        {savingInvite ? "送信中..." : "招待送信"}
                      </button>
                    </div>
                    {lastInviteResult && (
                      <div className="mt-2 rounded-lg border border-[#d8e6f5] bg-white p-2 text-xs text-[#365a83]">
                        <p>送信ステータス: {lastInviteResult.mailStatus}</p>
                        {lastInviteResult.mailError && <p className="mt-1 text-[#9b2b3d]">{lastInviteResult.mailError}</p>}
                        <p className="mt-1 break-all">招待リンク: {lastInviteResult.inviteUrl}</p>
                      </div>
                    )}
                  </form>
                )}

                <div className="mt-5 grid gap-4 min-[1024px]:grid-cols-2">
                  <section>
                    <h3 className="text-sm font-semibold text-[#17355f]">メンバー</h3>
                    {detailLoading ? (
                      <p className="mt-2 text-sm text-[#5d7898]">読み込み中...</p>
                    ) : (
                      <ul className="mt-2 space-y-2">
                        {members.map((member) => (
                          <li key={member.userId} className="rounded-lg border border-[#d8e6f5] bg-[#fbfdff] px-3 py-2">
                            <p className="text-sm font-semibold text-[#17355f]">
                              {member.displayName?.trim() || member.email}
                            </p>
                            <p className="text-xs text-[#52739a]">
                              {member.email} / {member.role}
                            </p>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>

                  <section>
                    <h3 className="text-sm font-semibold text-[#17355f]">招待履歴</h3>
                    {detailLoading ? (
                      <p className="mt-2 text-sm text-[#5d7898]">読み込み中...</p>
                    ) : invites.length === 0 ? (
                      <p className="mt-2 text-sm text-[#5d7898]">招待履歴はありません。</p>
                    ) : (
                      <ul className="mt-2 space-y-2">
                        {invites.map((invite) => {
                          const isPending = !invite.acceptedAt && !invite.revokedAt;
                          return (
                            <li key={invite.id} className="rounded-lg border border-[#d8e6f5] bg-[#fbfdff] px-3 py-2">
                              <p className="text-sm font-semibold text-[#17355f]">{invite.email}</p>
                              <p className="mt-0.5 text-xs text-[#52739a]">
                                作成: {formatDateTime(invite.createdAt)} / 期限: {formatDateTime(invite.expiresAt)}
                              </p>
                              <p className="mt-0.5 text-xs text-[#52739a]">
                                状態: {invite.acceptedAt ? "承認済み" : invite.revokedAt ? "取消済み" : "保留中"}
                              </p>
                              {isPending && isOwner && (
                                <button
                                  type="button"
                                  onClick={() => void handleRevokeInvite(invite.id)}
                                  className="mt-2 rounded-md border border-[#efb7c0] bg-[#fff1f3] px-2 py-1 text-xs font-semibold text-[#9e2740]"
                                >
                                  招待を取り消す
                                </button>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </section>
                </div>
              </>
            )}
          </section>
        </div>
      )}

      {error && (
        <p className="mt-4 rounded-xl border border-[#ffd4dc] bg-[#fff4f6] px-4 py-3 text-sm text-[#a31f2b]">
          {error}
        </p>
      )}
    </main>
  );
}

export default function WorkspaceManagePage() {
  return (
    <Suspense fallback={null}>
      <WorkspaceManagePageContent />
    </Suspense>
  );
}
