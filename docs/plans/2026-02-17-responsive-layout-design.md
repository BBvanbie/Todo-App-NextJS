# 2026-02-17 Responsive Layout Design

## Goal
認証後画面の全体レイアウトを以下4区分で統一する。既存の状態管理・API連携・業務ロジックは変更しない。

1. モバイル: 0-767px
2. tablet縦: 768-1023px
3. tablet横: 1024-1279px
4. PC: 1280px-

## Strategy
- ロジックは既存ページに維持し、レイアウト用クラスのみ調整する。
- `md/xl` の抽象運用ではなく、必要箇所で `min-[768px] / min-[1024px] / min-[1280px]` を明示する。
- ホームは既存のモバイル分岐とDesktopDashboard分岐を維持し、DesktopDashboard内グリッドを4区分仕様へ合わせる。

## Layout Rules
- モバイル: 下部固定ナビ + FAB、1カラム。
- tablet縦: 上部ヘッダー主導、本文1カラム。
- tablet横: ヘッダー + メニュー、本文2カラム（タスク群 + カレンダー）。
- PC: tablet横を踏襲しつつ情報密度を上げる（テーブル表示は1280px以上）。

## Scope
- Home (`/`)
- New task (`/tasks/new`)
- Categories (`/categories`)
- Calendar (`/calendar`)
- History (`/history`)
- Admin (`/admin`)

## Acceptance Criteria
- 1279pxの未定義領域が存在しない。
- 768pxでモバイル固定UI（下部バー/FAB）が非表示へ切替。
- 1024pxで主要ページがtablet横レイアウトへ切替。
- 1280pxでホームのタスク表示がテーブルへ切替。
- `npm run lint` が成功する。
