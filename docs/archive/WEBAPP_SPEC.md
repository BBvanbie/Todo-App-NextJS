# Todoアプリ 仕様メモ

最終更新: 2026-02-14  
対象リポジトリ: `next-todos`

## 1. 概要
- 個人利用向けのTodo管理アプリ
- 技術構成:
  - Next.js (App Router)
  - TypeScript
  - Prisma + Neon (PostgreSQL)
  - Vercel デプロイ
- 基本方針:
  - UIは日本語
  - 期限管理を重視（7日以内=注意 / 期限切れ=警告）
  - アプリ内通知（Push/メールではない）

## 2. 画面構成

### 2.1 ダッシュボード `/`
- 未完了タスク一覧
- 完了タスク一覧
- 通知エリア（未読件数バッジ、通知一覧、個別既読、全件既読）
- フィルター/検索:
  - 件名・メモ検索
  - カテゴリ
  - 重要度
  - 期限帯（すべて / 今日まで / 7日以内 / 期限切れ）
- 集計表示:
  - 未完了件数
  - 7日以内件数
  - 期限切れ警告件数
  - 完了件数
- 完了時演出:
  - 画面上部にお祝いバナーを短時間表示

### 2.2 新規作成 `/tasks/new`
- 入力項目:
  - 件名（必須）
  - 日付（必須）
  - メモ（任意）
  - カテゴリ（必須・選択）
  - 重要度（必須・選択）

### 2.3 履歴 `/history`
- 完了タスクの履歴一覧
- 表示項目:
  - 件名
  - カテゴリ
  - 重要度
  - メモ
  - 期限
  - 完了日

## 3. データモデル（Prisma）

`prisma/schema.prisma`

### 3.1 enum
- `TodoCategory`
  - `WORK`, `PRIVATE`, `PROCEDURE`, `STUDY`, `HEALTH`, `SHOPPING`, `OTHER`
- `TodoPriority`
  - `HIGH`, `MEDIUM`, `LOW`
- `NotificationType`
  - `DUE_IN_7_DAYS`
  - `DUE_IN_3_DAYS`
  - `DUE_TODAY`
  - `OVERDUE_3_DAYS`

### 3.2 model `Todo`
- `id: Int` (PK, autoincrement)
- `title: String`
- `memo: String?`
- `category: TodoCategory` (default: `OTHER`)
- `priority: TodoPriority` (default: `MEDIUM`)
- `completed: Boolean` (default: `false`)
- `dueAt: DateTime`
- `completedAt: DateTime?`
- `createdAt: DateTime` (default: now)
- `updatedAt: DateTime` (@updatedAt)
- relation:
  - `notifications: Notification[]`

### 3.3 model `Notification`
- `id: Int` (PK, autoincrement)
- `todoId: Int` (FK -> `Todo.id`)
- `type: NotificationType`
- `message: String`
- `createdAt: DateTime` (default: now)
- `readAt: DateTime?`
- unique:
  - `@@unique([todoId, type])`（同一タスク・同一通知種別の重複防止）

## 4. API仕様

### 4.1 Todo API

#### `GET /api/todos`
- Todo一覧を返す

#### `POST /api/todos`
- 新規作成
- 受け取り:
  - `title: string`（必須）
  - `dueAt: ISO string`（必須）
  - `memo: string | null`（任意）
  - `category: TodoCategory`（任意、未指定時は`OTHER`）
  - `priority: TodoPriority`（任意、未指定時は`MEDIUM`）

#### `PATCH /api/todos/:id`
- 部分更新
- 更新可能項目:
  - `title`
  - `dueAt`
  - `memo`
  - `category`
  - `priority`
  - `completed`
- `completed`更新時:
  - `true` -> `completedAt = now`
  - `false` -> `completedAt = null`

#### `DELETE /api/todos/:id`
- 削除

### 4.2 通知API

#### `GET /api/notifications`
- 通知一覧（最新順、最大50件）を返す
- `todo`の最小情報を含む

#### `PATCH /api/notifications/:id/read`
- 指定通知を既読化（`readAt = now`）

#### `PATCH /api/notifications/read-all`
- 未読通知を全件既読化

### 4.3 Cron API（通知生成）

#### `GET /api/cron/notifications`
- `CRON_SECRET` 認証必須
  - `Authorization: Bearer <CRON_SECRET>` または `x-cron-secret`
- 未完了タスクを対象に、以下ルールで通知を生成:
  - 期限7日前
  - 期限3日前
  - 当日
  - 期限切れ3日後
- 重複通知は `@@unique([todoId, type])` で抑止

## 5. 通知仕様（アプリ内）
- 通知はDBに保存される
- ダッシュボードで表示
- 未読はバッジ件数で可視化
- 既読化はボタン操作
  - 個別既読
  - 全件既読
- メール通知・Web Push通知は未実装

## 6. 期限判定ルール
- `dueAt < 今日` -> 警告（期限切れ）
- `今日 <= dueAt <= 今日+7日` -> 注意
- それ以外 -> 通常

## 7. デプロイ/運用（Vercel）

### 7.1 必須環境変数
- `DATABASE_URL`
- `DIRECT_URL`
- `CRON_SECRET`

### 7.2 Cron設定
`vercel.json` で通知生成を定期実行:
- path: `/api/cron/notifications`
- schedule: `5 15 * * *`（UTC）

注:
- UTC `15:05` は JST `00:05`

## 8. 既知事項
- 本番反映は `main` push でVercel自動デプロイ
- ブラウザキャッシュにより旧表示が残る場合があるため、反映確認時は強制再読み込み推奨
