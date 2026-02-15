# Next Steps（2026-02-16時点）

## Phase 1: チーム基盤（最優先）
1. `Workspace` / `WorkspaceMember` / `WorkspaceInvite` を追加
2. 個人用 Personal Workspace 自動作成
3. Todoをworkspaceスコープへ移行
4. APIガード（401/403/404）をworkspace前提に統一

## Phase 2: 監査強化
1. `AuditLog` を追記専用（immutable）に固定
2. `actor/action/target/diff/requestId/ip/userAgent` を完全記録
3. 監査閲覧UI（フィルタ付き）を追加

## Phase 3: 運用効率
1. assignee運用強化（チーム選択/担当フィルタ）
2. バルク操作の拡張（期限/担当変更）
3. 論理削除とアーカイブ運用の明確化

## Phase 4: 通知拡張
1. アプリ内通知のイベント統一
2. Push通知（VAPID）
3. 招待/期限通知のメール連携

## 直近ToDo（短期）
- 大画面ダッシュボードの最終文言/余白調整
- APIエラーレスポンスのUI表示統一
- E2Eベースの回帰チェック導入
