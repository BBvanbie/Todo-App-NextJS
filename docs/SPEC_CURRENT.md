# Next-App-Todos 現行仕様書（最新版 / 2026-02-17）

## 1. アプリ概要
- 目的: 個人利用を中心に、将来的なチーム運用を見据えたTodo管理Webアプリ
- 認証: メール/パスワード（next-auth Credentials）
- 権限: `ADMIN` / `USER`
- 主要特徴:
  - カテゴリ管理（カスタムカテゴリ + 組み込みカテゴリ表示名編集）
  - 状態管理（`OPEN / IN_PROGRESS / BLOCKED / DONE`）
  - 通知/編集履歴/複製/バルク操作
  - 4ブレークポイント対応のレスポンシブ最適化

## 2. 技術構成
- Next.js App Router / React / Tailwind CSS
- API: Route Handlers (`/app/api/*`)
- DB: Neon PostgreSQL + Prisma（HTTPモード）
- 更新系: 一部Raw SQL併用（HTTPモード制約対応）
- 共通エラー: `code/message/details/requestId` + `x-request-id`

## 3. データモデル（主要）
- `User`: `email`, `passwordHash`, `displayName`, `role`
- `Todo`: `title`, `memo`, `category`, `priority`, `status`, `completed`, `startAt`, `dueAt`, `completedAt` ほか
- `UserCategory`: ユーザー作成カテゴリ（上限10件）
- `UserBuiltinCategoryLabel`: 組み込みカテゴリ表示名のユーザー別上書き
- `TodoEditHistory`: 編集履歴
- `Notification`: 通知

## 4. タスク仕様
- 必須: `title`, `dueAt`（期限日付は必須、時刻は任意）
- 任意: `startAt`（開始日/開始時刻）
- 補完ルール: `startAt` 未指定時はサーバー側で登録日時を設定
- 優先度: `HIGH / MEDIUM / LOW`
- 状態: `OPEN / IN_PROGRESS / BLOCKED / DONE`
- 整合ルール: `DONE` と `completed=true` はAPI側で整合
- 日時整合: `startAt > dueAt` は API で `INVALID_DATE_RANGE` を返却

## 5. UI/UX仕様（最新）
- 画面サイズ定義:
  - モバイル: `0-767px`
  - tablet縦: `768-1023px`
  - tablet横: `1024-1279px`
  - PC: `1280px-`
- モバイル:
  - 検索/絞り込みは折り畳み
  - 下部バー常時表示
  - 新規作成は独立FAB
- tablet縦/横:
  - 検索/絞り込みはクリック開閉
  - KPIタップで専用一覧ページへ遷移
- PC:
  - 左上ハンバーガーでメニュー表示
  - 検索/絞り込みは `hover + click固定` のハイブリッド
  - KPIタップでモーダル一覧表示
  - タスク領域とカレンダーを 1:1 配置
- タスク表示:
  - `1280px未満`: カード表示（重要度/担当/状態/期限表示 + 警告/注意色分け）
  - `1280px以上`: テーブル表示（重要度/状態列あり + 期限ベース行色分け）
- カレンダー表示:
  - タスクバー開始日は `startAt` を優先
  - `startAt` 未設定時は `createdAt` を開始日として表示

## 6. 主要画面
- `/login`, `/register`
- `/`（ホーム/ダッシュボード）
- `/tasks/new`
- `/tasks/summary/[kpi]`（KPI専用一覧）
- `/categories`
- `/calendar`
- `/history`
- `/admin`（ADMINのみ）

## 7. API（主要）
- 認証: `POST /api/auth/register`
- Todo: `GET/POST /api/todos`, `PATCH/DELETE /api/todos/:id`, `POST /api/todos/:id/duplicate`, `GET /api/todos/:id/edits`, `GET /api/todos/stats`
- カテゴリ: `GET/POST /api/categories`, `PATCH/DELETE /api/categories/:id`, `PATCH /api/categories/builtin`
- 通知: `GET /api/notifications`, `PATCH /api/notifications/:id/read`, `PATCH /api/notifications/read-all`
- 監査（最小）: `GET /api/audit`

## 8. デプロイ状態
- GitHub: `origin/main`（今回変更はローカル反映済み）
- Vercel: Git連携で `main` 自動デプロイ設定

## 9. 既知の未実装領域
- Workspace / Invite / Member（チーム基盤）
- 監査ログの本格化（immutable + diff強化）
- 論理削除 (`deletedAt`) の運用徹底
- 通知拡張（Push/メール）
