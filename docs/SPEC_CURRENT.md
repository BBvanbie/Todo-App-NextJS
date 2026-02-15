# Next-App-Todos 現行仕様書（最新版 / 2026-02-16）

## 1. アプリ概要
- 目的: 個人利用を中心に、将来的なチーム運用を見据えたTodo管理Webアプリ
- 特徴:
  - 認証付き（メール/パスワード）
  - 管理者/一般ユーザーの権限分離
  - モバイル優先の操作性
  - カテゴリのユーザー編集対応
  - タスク状態（status）管理対応
  - 通知・編集履歴・複製・バルク操作対応

## 2. 技術構成
- フロント: Next.js App Router / React / Tailwind CSS
- バックエンド: Next.js Route Handlers (`/app/api/*`)
- 認証: next-auth Credentials（JWT）
- DB: PostgreSQL（Neon）
- ORM: Prisma（HTTPモード）
- 方針:
  - トランザクション制約回避のため、更新系でRaw SQLを併用
  - APIレスポンスは共通エラーフォーマット + `requestId`

## 3. 認証・権限
- ログイン方式: メールアドレス + パスワード
- ユーザーロール:
  - `ADMIN`
  - `USER`
- 権限制御:
  - 未ログインAPIは `401`
  - 管理者専用領域（`/admin`）は `ADMIN` のみ

## 4. データモデル（実装済み中心）
- `User`
  - `id`, `email`, `passwordHash`, `displayName`, `role`
- `Todo`
  - `id`, `userId`, `title`, `memo`, `category`, `priority`, `status`, `completed`, `dueAt`, `completedAt`, `createdAt`, `updatedAt`
- `UserCategory`（カスタムカテゴリ）
  - `id`, `userId`, `name`, `createdAt`, `updatedAt`
  - 上限: 1ユーザーあたり10件
- `UserBuiltinCategoryLabel`（組み込みカテゴリ表示名）
  - `id`, `userId`, `builtinKey`, `label`, `createdAt`, `updatedAt`
- `TodoEditHistory`
  - `id`, `todoId`, `userId`, `editedAt`
- `Notification`
  - `id`, `todoId`, `userId`, `type`, `message`, `readAt`, `createdAt`

## 5. タスク仕様
- 必須項目: `title`, `dueAt`
- 任意項目: `memo`
- カテゴリ:
  - 組み込み値: `WORK / PRIVATE / PROCEDURE / STUDY / HEALTH / SHOPPING / OTHER`
  - カスタムカテゴリ作成可（上限10）
  - 組み込みカテゴリは「表示名」をユーザーごとに編集可（カテゴリ値自体は固定）
- 優先度: `HIGH / MEDIUM / LOW`
- 状態: `OPEN / IN_PROGRESS / BLOCKED / DONE`
- 完了フラグとの整合:
  - `DONE` <=> `completed=true`
  - API側で整合性を強制

## 6. 主要機能
- Todo CRUD
- Todo複製（次回分作成）
- 編集履歴表示
- 通知一覧 / 既読化 / 全既読化
- 検索・絞り込み
  - カテゴリ / 優先度 / 状態 / 期限
- バルク操作
  - 複数選択
  - 一括完了 / 一括未完了化 / 一括削除 / 選択解除
- カテゴリ管理画面
  - カスタムカテゴリの追加・編集・削除
  - 組み込みカテゴリ表示名の編集

## 7. 画面構成
- `/login`: ログイン
- `/register`: 新規登録
- `/`: ホーム（ダッシュボード + 一覧 + フィルタ + バルク操作）
- `/tasks/new`: タスク作成
- `/categories`: カテゴリ管理
- `/history`: 履歴確認
- `/admin`: 管理者画面（ADMINのみ）

## 8. API（主要）
- 認証
  - `POST /api/auth/register`
- Todo
  - `GET /api/todos`
  - `POST /api/todos`
  - `PATCH /api/todos/:id`
  - `DELETE /api/todos/:id`
  - `POST /api/todos/:id/duplicate`
  - `GET /api/todos/:id/edits`
- カテゴリ
  - `GET /api/categories`
  - `POST /api/categories`
  - `PATCH /api/categories/:id`
  - `DELETE /api/categories/:id`
  - `PATCH /api/categories/builtin`
- 通知
  - `GET /api/notifications`
  - `PATCH /api/notifications/:id/read`
  - `PATCH /api/notifications/read-all`

## 9. エラー設計
- 共通形式:
  - `code`
  - `message`
  - `details`（必要時）
  - `requestId`
- ヘッダにも `x-request-id` を付与

## 10. 運用上の注意
- Prisma HTTPモード制約のため、更新系の一部はRaw SQL
- `Todo.category` や `Todo.status` 等はAPI側に互換保護あり
- 本番運用ではマイグレーション適用を推奨（自己修復は補助）

## 11. 既知の残課題（未実装領域）
- Workspace/Invite/Memberなどチーム基盤
- 監査ログの本格実装（immutableなAuditLog）
- 担当者（assignee）
- 論理削除（`deletedAt`）
- サーバー側高度検索（全文・複合条件最適化）
