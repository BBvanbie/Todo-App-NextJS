# Workspace Team Feature Design (2026-02-17)

## Goal
個人利用前提の Todo アプリに、ワークスペース単位の共有機能を追加する。

- 個人ワークスペースと共有ワークスペースを切り替え可能にする
- 招待はメール認可を前提とし、リンクコピー（LINE等での共有）にも対応する
- 既存の個人利用データを破壊せず移行する

## Decisions

### Workspace model
- 共有単位は `Workspace`
- 各ユーザーに `Personal Workspace` を1つ持たせる
- サイドバーからアクティブワークスペースを切り替える

### Invite security
- 招待方式は `メール制限あり` 固定
- 招待リンクを受け取っても、招待先メールアドレスでログインしていない場合は参加不可
- 招待導線は2本立て
  - システムメール送信
  - リンクコピー（LINE/Message等で手動送付）

### Roles
- ロールは `OWNER` / `MEMBER`
- `OWNER only`
  - 新規メンバー招待
  - 招待リンク無効化
  - メンバー削除
  - ワークスペース削除
- `OWNER / MEMBER` 共通
  - ワークスペース名変更
  - Todo/カテゴリなどの通常操作

## UX Design

### Sidebar switcher
- Todoコントロールセンターのサイドバー上部に `Workspace Switcher` を追加
- `Personal` + 参加中共有ワークスペースを一覧表示
- 現在選択中ワークスペースを明示表示

### KPI and page scope
- 現在のワークスペースをページ全体のデータ取得スコープに適用
- `/?ws=<workspaceId>` などURLで現在ワークスペースを持てるようにする

### Workspace management
- ` /workspace` 画面を追加
- 共通機能
  - ワークスペース名変更
  - メンバー一覧
- OWNER機能
  - 招待メール送信
  - 招待リンク発行・コピー
  - 招待無効化

### Invite accept
- `/invite/[token]` で受諾
- 未ログイン時は `/login` へ
- ログイン後に `invite.email === session.user.email` を厳密照合
- 一致時のみ参加

## Data Model

### New tables
- `Workspace`
  - `id`, `name`, `ownerUserId`, `isPersonal`, `createdAt`, `updatedAt`
- `WorkspaceMember`
  - `workspaceId`, `userId`, `role(OWNER|MEMBER)`, `joinedAt`
  - unique: `(workspaceId, userId)`
- `WorkspaceInvite`
  - `id`, `workspaceId`, `email`, `tokenHash`, `invitedByUserId`, `expiresAt`, `acceptedAt`, `revokedAt`, `createdAt`

### Existing table changes
- `Todo.workspaceId` を追加してワークスペースでスコープ
- 段階移行で nullable -> backfill -> not null

## API Design
- `GET /api/workspaces`
- `PATCH /api/workspaces/:id`
- `GET /api/workspaces/:id/members`
- `POST /api/workspaces/:id/invites` (OWNER)
- `POST /api/workspaces/invites/:token/accept`
- `POST /api/workspaces/:id/invites/:inviteId/revoke` (OWNER)

## Error Handling
- `WORKSPACE_FORBIDDEN`
- `INVITE_TOKEN_INVALID`
- `INVITE_TOKEN_EXPIRED`
- `INVITE_EMAIL_MISMATCH`
- `OWNER_REQUIRED`

## Delivery Plan
1. Schema追加 + 安全移行
2. 認可基盤の共通化（workspace membership guard）
3. サイドバー切替 + workspace管理UI
4. 招待メール連携（Resend）
5. E2E回帰・仕様書更新

## Migration Strategy
1. `Workspace / WorkspaceMember / WorkspaceInvite` 追加
2. `Todo.workspaceId` nullable追加
3. 全ユーザーにPersonal Workspaceを作成
4. 既存TodoをPersonal Workspaceへバックフィル
5. `Todo.workspaceId` を NOT NULL 化

## Risks and mitigations
- 既存APIのworkspace漏れ
  - 共通ガード関数でAPI入口に統一チェック
- 招待リンクの流出
  - メール一致検証を必須化
- 移行中の整合性破壊
  - nullable期間を設け、バックフィル後に制約強化
