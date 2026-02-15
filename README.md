# Next-App-Todos

個人利用を中心に、将来的なチーム運用を見据えた Todo 管理アプリです。

## 主な機能
- メール/パスワード認証（next-auth Credentials）
- ロール管理（`ADMIN` / `USER`）
- Todo作成・編集・削除・複製・履歴
- カテゴリ管理（カスタムカテゴリ最大10件）
- 組み込みカテゴリ名のユーザー別編集
- ステータス管理（`OPEN / IN_PROGRESS / BLOCKED / DONE`）
- 通知一覧/既読化
- バルク操作（複数選択で一括更新/削除）

## 技術スタック
- Next.js App Router
- React
- Tailwind CSS
- next-auth
- Prisma + Neon PostgreSQL（HTTPモード）

## セットアップ
1. 依存をインストール
```bash
npm install
```

2. 環境変数を設定（`.env.local`）
```env
DATABASE_URL=...
AUTH_SECRET=...
ADMIN_EMAIL=admin
ADMIN_PASSWORD=...
CRON_SECRET=...
```

3. 開発サーバー起動
```bash
npm run dev
```

4. 静的チェック
```bash
npm run lint
```

## よく使う画面
- `/` ホーム（ダッシュボード + タスク一覧）
- `/tasks/new` 新規作成
- `/categories` カテゴリ管理
- `/history` 履歴
- `/admin` 管理者向け

## API（主要）
- `GET/POST /api/todos`
- `PATCH/DELETE /api/todos/:id`
- `POST /api/todos/:id/duplicate`
- `GET /api/todos/:id/edits`
- `GET/POST /api/categories`
- `PATCH/DELETE /api/categories/:id`
- `PATCH /api/categories/builtin`

## ドキュメント
- `docs/SPEC_CURRENT.md`
- `docs/IMPROVEMENT_FEASIBILITY_2026-02-15.md`
- `docs/README.md`

## 補足
- Neon HTTPモード制約により、更新系は一部Raw SQLを併用しています。
- APIは `requestId` を返す共通エラー形式を採用しています。
