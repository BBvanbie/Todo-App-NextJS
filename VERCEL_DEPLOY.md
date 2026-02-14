# Vercelデプロイ手順

このプロジェクトはそのままVercelへデプロイできますが、本番動作には環境変数の設定が必須です。

## 1) リポジトリを接続
- Vercelダッシュボードを開く
- `Add New...` -> `Project`
- `BBvanbie/Todo-App-NextJS` をImport
- Root Directory は `next-todos` を指定
- Framework Preset は `Next.js`

## 2) 環境変数を設定
Vercel Project Settings -> Environment Variables で以下を設定:

必須（現行アプリで使用）:
- `DATABASE_URL`（NeonのPooled接続文字列）
- `DIRECT_URL`（NeonのDirect接続文字列）

通知機能に向けて事前準備:
- `CRON_SECRET`
- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT`

値は `.env.example` をひな形として入力してください。

## 3) デプロイ実行
- `Deploy` をクリック
- ビルド完了を待つ
- 本番URL（例: `https://<project>.vercel.app`）が発行される

## 4) デプロイ後の確認
- `/` が表示される
- Todoの新規作成ができる
- Todoの編集ができる
- Todoの完了切替ができる
- `/history` が表示される

## 5) よくある失敗
- Root Directoryが誤っている（`next-todos` 必須）
- `DATABASE_URL` / `DIRECT_URL` の未設定または誤り
- Neon側の接続情報不一致
