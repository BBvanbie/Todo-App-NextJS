# Next-App-Todos 改善実行状況（最新版 / 2026-02-16）

## 0. 凡例
- 完了: 実装済み + lint確認済み
- 着手済み: 実装あり、今後の拡張や運用整理が必要
- 未着手: これから実装

## 1. 完了した項目

### 1-1. カテゴリ機能の拡張
- 固定カテゴリのみから、ユーザー管理可能なカテゴリへ拡張
- カスタムカテゴリ:
  - 作成 / 編集 / 削除
  - 1ユーザー10件上限
- 組み込みカテゴリ:
  - 表示名をユーザー単位で編集可能
  - 編集してもカスタムカテゴリは増えない
- ホーム/新規/編集/複製のカテゴリ選択へ反映

主な実装:
- `app/api/categories/route.ts`
- `app/api/categories/[id]/route.ts`
- `app/api/categories/builtin/route.ts`
- `app/categories/page.tsx`
- `lib/categories.ts`

### 1-2. Todoの状態管理（status）導入
- `status` 追加: `OPEN / IN_PROGRESS / BLOCKED / DONE`
- `status` と `completed` の整合ルールをAPIで強制
- 新規作成・編集・複製・一覧表示・フィルタに反映

主な実装:
- `lib/todo-status.ts`
- `app/api/todos/route.ts`
- `app/api/todos/[id]/route.ts`
- `app/api/todos/[id]/duplicate/route.ts`
- `app/_components/todos/*`
- `app/_components/new-task/*`
- `app/page.tsx`
- `app/tasks/new/page.tsx`

### 1-3. Todo API安定化
- Prisma HTTPモード制約を考慮し、更新系を中心にRaw SQL運用
- カテゴリ移行時の互換保護を追加
- カスタムカテゴリ混在データでも読み込み失敗しにくい構成へ改善

主な実装:
- `app/api/todos/route.ts`
- `app/api/todos/[id]/route.ts`
- `app/api/todos/[id]/duplicate/route.ts`
- `app/api/todos/[id]/edits/route.ts`

### 1-4. UI/UX改善（ホーム中心）
- モバイル/PCの情報密度調整
- 下部固定バー、トップへ戻るボタン、削除確認モーダル
- KPI表示の改善
- フィルタUX改善（チップ含む）
- PCカード内のボタン広がり抑制などレイアウト修正

主な実装:
- `app/page.tsx`
- `app/_components/todos/PendingTodosSection.tsx`
- `app/_components/todos/CompletedTodosSection.tsx`

### 1-5. バルク操作
- 複数選択
- 一括完了 / 一括未完了化 / 一括削除 / 選択解除
- セクション単位の全選択

主な実装:
- `app/page.tsx`
- `app/_components/todos/PendingTodosSection.tsx`
- `app/_components/todos/CompletedTodosSection.tsx`

### 1-6. APIエラー標準化
- `code/message/details/requestId` の共通エラー形式
- `x-request-id` ヘッダ付与

主な実装:
- `lib/api-response.ts`
- `app/api/**` 主要ルート

## 2. 着手済み（運用整理が必要）

### 2-1. 自己修復的な互換処理
- テーブル/カラム不足時にAPI側で吸収する保護を導入
- 本番運用では正式マイグレーション適用を推奨

関連:
- `lib/categories.ts`
- `lib/todo-status.ts`
- `prisma/migrations/*`

## 3. 未着手（次フェーズ）

### 3-1. チーム基盤
- Workspace / Member / Invite
- Personal Workspace設計

### 3-2. 監査ログ本格化
- immutableな `AuditLog`
- actor/action/target/diff/requestId/ip/userAgentの記録

### 3-3. Todo拡張
- `assigneeUserId`
- `deletedAt`（論理削除）
- ステータス遷移ルールの厳密化

### 3-4. API再編（workspaceスコープ）
- `/api/workspaces/*`
- member guard（401/403/404厳密化）

### 3-5. 通知拡張
- イベント駆動の通知体系
- Push/メール通知

## 4. 直近の推奨優先順位
1. `assignee` 導入（最小版: 自分/未設定）
2. 論理削除（`deletedAt`）導入
3. 監査ログの最小実装（Todo更新/削除/複製）
4. Workspace基盤のPhase 1着手

## 5. 動作確認済み範囲
- 認証（登録/ログイン）
- Todo作成/編集/削除/複製/履歴
- カテゴリ追加/編集/削除
- 組み込みカテゴリ名編集
- status編集とフィルタ
- バルク操作
- lint通過

## 6. マイグレーション（追加済み）
- `prisma/migrations/20260215223000_add_user_categories_and_text_todo_category/`
- `prisma/migrations/20260215235000_add_todo_status/`
- `prisma/migrations/20260216001000_add_user_builtin_category_label/`
