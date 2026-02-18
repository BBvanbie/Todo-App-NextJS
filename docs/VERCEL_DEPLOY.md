# Vercel Deploy

このプロジェクトを Vercel にデプロイする手順です。

## 1. プロジェクト作成
1. Vercel ダッシュボードを開く
2. `Add New` -> `Project`
3. GitHub リポジトリ `BBvanbie/Todo-App-NextJS` を選択
4. Framework Preset は `Next.js` を選択

## 2. 環境変数設定
Vercel `Settings` -> `Environment Variables` で設定する。

### 必須
- `DATABASE_URL`
- `DIRECT_URL`
- `AUTH_SECRET`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `CRON_SECRET`
- `NEXT_PUBLIC_APP_URL`

### メール送信（招待）
- `MAIL_SEND_ENABLED=true`
- `RESEND_API_KEY`
- `MAIL_FROM`（例: `TaskHub Todo <noreply@taskhub.info>`）
- `MAIL_REPLY_TO`（例: `support@taskhub.info`）
- `WORKSPACE_INVITE_EXPIRES_HOURS=24`

### 任意
- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT`

## 3. デプロイ
1. `Deploy` を実行
2. ビルド完了を確認
3. 発行 URL にアクセスして動作確認

## 4. 再デプロイが必要なケース
- 環境変数を追加・変更したとき
- メール送信元ドメインを変更したとき
- 認証関連設定を変更したとき

## 5. トラブルシュート
- `MAIL_SEND_ENABLED is not true`
  - `MAIL_SEND_ENABLED=true` が設定されているか確認
  - 設定先環境（Production/Preview）が一致しているか確認
  - 再デプロイ済みか確認

- `You can only send testing emails...`
  - Resend のドメイン認証が未完了
  - `MAIL_FROM` が認証済みドメインと一致しているか確認

- Build failed
  - `npm run lint`
  - `npx tsc --noEmit`
  - `npm run build`
  をローカルで通してから再デプロイ
