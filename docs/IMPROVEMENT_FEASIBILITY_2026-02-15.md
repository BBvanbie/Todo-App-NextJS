# Next-App-Todos 改善実行状況（更新版 / 2026-02-16）

## 0. 凡例
- 完了: 実装済み + lint/tsc確認済み
- 進行中: 実装一部あり（追加調整予定）
- 未着手: これから実装

## 1. 完了

### 1-1. カテゴリ機能
- カスタムカテゴリ（作成/編集/削除、上限10件）
- 組み込みカテゴリ表示名のユーザー別編集
- ホーム/新規/編集/複製への反映

### 1-2. タスク状態管理
- `OPEN / IN_PROGRESS / BLOCKED / DONE` 導入
- `status` と `completed` の整合制御

### 1-3. ホームUI大幅改修
- モバイル/タブレット/PCのレスポンシブ最適化
- 検索/絞り込みの折り畳み統一
- KPIカード再設計
- バルク操作強化
- 下部バー + トップへ戻る導線

### 1-4. PCダッシュボード改善
- `770〜1022px` 帯域で横スクロール抑制（縦読み重視）
- `xl` で左右 1:1（タスク/カレンダー）
- `xl未満` カード、`xl以上` テーブルの二段構成
- 重要度/担当/状態/期限の表示を両レイアウトで統一
- 期限ベース色分け（警告/注意）をカード/テーブル両対応
- サイドバーをハンバーガー表示 + ホバーアウトで自動非表示

### 1-5. 監査・API基盤
- 監査APIの最小導入
- 共通APIエラー形式 + requestId

### 1-6. デプロイ運用
- GitHub `main` push 完了
- VercelのGit連携自動反映設定を確認済み
- 本番障害ホットフィックスを適用
  - middlewareのtoken読取を例外安全化
  - `AUTH_SECRET / NEXTAUTH_SECRET / AUTHJS_SECRET` フォールバック
  - NextAuthルートを `nodejs runtime` 固定
  - ログイン時の `Server configuration` エラー解消

## 2. 進行中
- ダッシュボード文言/レイアウトの微調整（継続）
- 監査ログの項目拡張（必要時）
- 本番監視の補強（失敗APIの早期検知）

## 3. 未着手（優先順）
1. Workspace / Invite / Member のチーム基盤
2. 論理削除 (`deletedAt`) の運用徹底
3. 監査ログの immutable 設計強化（before/after差分）
4. 通知のイベント駆動化（Push/メール）
5. 検索/フィルタのサーバー最適化

## 4. 追加済みマイグレーション
- `20260215223000_add_user_categories_and_text_todo_category`
- `20260215235000_add_todo_status`
- `20260216001000_add_user_builtin_category_label`
- `20260216013000_add_todo_assignee`
- `20260216022000_add_audit_log`
- `20260216030000_add_todo_deleted_at`
