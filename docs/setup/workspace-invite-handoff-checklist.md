# Workspace Invite Handoff Checklist

共有ワークスペース招待（メール送信）を本番運用するための最終チェックリストです。

## 1. 環境変数
- `MAIL_SEND_ENABLED=true`
- `RESEND_API_KEY=<your resend api key>`
- `MAIL_FROM="TaskHub Todo <noreply@taskhub.info>"`
- `MAIL_REPLY_TO="support@taskhub.info"`
- `NEXT_PUBLIC_APP_URL="https://<your-production-domain>"`
- `WORKSPACE_INVITE_EXPIRES_HOURS="24"`

## 2. ドメイン認証（Resend）
- Resend Domains で `taskhub.info` を追加
- ステータスが `Verified` になることを確認
- `MAIL_FROM` のドメイン部が `taskhub.info` と一致していることを確認

## 3. DNS レコード（Xserver）
Resend 側に表示された値を最優先で設定すること。

### DKIM
- 種別: `TXT`
- ホスト名: `resend._domainkey`
- 内容: `p=...`（Resend表示の公開鍵）
- TTL: `Auto` または `3600`

### SPF
- 種別: `MX`
- ホスト名: `send`
- 内容: `feedback-smtp.ap-northeast-1.amazonses.com`
- 優先度: `10`

- 種別: `TXT`
- ホスト名: `send`
- 内容: `v=spf1 include:amazonses.com ~all`
- TTL: `Auto` または `3600`

### DMARC
- 種別: `TXT`
- ホスト名: `_dmarc`
- 内容: `v=DMARC1; p=none;`
- TTL: `Auto` または `3600`

## 4. 招待仕様（運用）
- 招待リンク有効期限: `24時間`
- 招待受諾条件: 招待メールアドレスとログイン中アカウントのメール一致
- ロール: `OWNER` / `MEMBER`
- 招待操作: `OWNER` のみ

## 5. 動作確認
- OWNER で招待送信し、`mailStatus: sent` を確認
- MEMBER で招待リンク受諾できることを確認
- メール不一致時に受諾失敗となることを確認
- 期限切れトークンで受諾失敗となることを確認

## 6. 障害時の見方
- `mailStatus: skipped`: 環境変数不足または送信無効
- `mailStatus: failed`: メールプロバイダ側エラー（Resend制限含む）
- API 応答の `mailError` で具体原因を確認
