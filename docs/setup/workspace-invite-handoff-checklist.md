# Workspace Invite Handoff Checklist

このファイルは、共有ワークスペース招待（メール送信）を実装するために、あなたから私へ共有してほしい情報の一覧です。

## 1. メール送信プロバイダ情報
- 利用プロバイダ: `Resend`（想定）
- `RESEND_API_KEY`
- 送信元メール: `MAIL_FROM`（例: `Todo App <noreply@your-domain.com>`）
MAIL_FROM="TaskHub Todo <noreply@taskhub.com>"
- 返信先メール: `MAIL_REPLY_TO`（例: `support@your-domain.com`）
MAIL_REPLAY_TO="support@taskhub.com"

## 2. ドメイン設定
- 送信元ドメインの検証状態（SPF/DKIMが有効か）
- 本番で使う送信元アドレス

## 2-2.　DKIM
- type:TXT
- Name:resend._domainkey 
- content: p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDhbe9y6OZNymC4Iy1nekFSAsgIJfBFInCM6miVF9YbovZyH6ri3bFYy3NtE4aV5sQ6/oqwxz/YwBdj8j//8mGKOlB6OOhrWUS3XHqOZkt8DXY9AQo82/0TbYq6tr8CgmJ0d16kyl2dz61YCGdoZBBE/fpOo9NCmRMG4ei5tgDlSwIDAQAB
- TTL: Auto

## 2-3. SPF
- type: MX
- name: send
- content: feedback-smtp.ap-northeast-1.amazonses.com
- ttl: auto

- type: TXT
- name: send
- content: v=spf1 include:amazonses.com ~all
- ttl: auto

## 2-4. DMARC
- type: TXT
- name: _dmarc
- content: v=DMARC1; p=none;
- ttl: auto

## 3. アプリURL
- 本番URL（例: `https://todo.example.com`）
- 必要ならステージングURL
- `NEXT_PUBLIC_APP_URL` に設定する値

## 4. 招待ルール（確定済み）
- 招待リンク有効期限: `24時間`
- 招待受諾条件: 招待先メールアドレスとログイン中アカウントのメールが一致
- ロール: `OWNER` / `MEMBER`
- 招待操作: `OWNERのみ`

## 5. 文言最終確認
- 招待メール件名（日本語）
- 招待メール本文（text/html）
- 受諾失敗時の表示文言
  - 期限切れ
  - メール不一致
  - 無効トークン

## 6. 動作確認用アカウント
- OWNERアカウント（1つ）
- 招待先MEMBERアカウント（1つ）
- メール不一致確認用アカウント（1つ）

## 7. 実装時の運用判断
- メール送信失敗時に招待レコードを残すか（推奨: 残す + 再送）
- 招待再送を同一メールで許可するか
- 招待無効化時のUI（即時反映）

## 8. セキュリティ/監査
- 招待発行/受諾/無効化を監査ログに残すか（推奨: 残す）
- 招待トークンは平文保存しない（推奨: hash保存）
