import { Resend } from "resend";

type SendWorkspaceInviteMailInput = {
  toEmail: string;
  inviteeName?: string | null;
  inviterName: string;
  workspaceName: string;
  inviteUrl: string;
};

type SendWorkspaceInviteMailResult =
  | { status: "sent"; providerMessageId: string | null }
  | { status: "skipped"; reason: string };

function env(name: string) {
  return process.env[name]?.trim() ?? "";
}

function resolveInviteExpiryHours() {
  const raw = env("WORKSPACE_INVITE_EXPIRES_HOURS");
  const num = Number(raw);
  if (!Number.isFinite(num) || num <= 0) return 24;
  return Math.floor(num);
}

function buildTextTemplate(input: SendWorkspaceInviteMailInput, expiryHours: number) {
  const inviteeName = input.inviteeName?.trim() || "ユーザー";
  return (
    `[TaskHub Todo] ワークスペース「${input.workspaceName}」への招待\n\n` +
    `${inviteeName} さん\n\n` +
    `${input.inviterName} さんから、ワークスペース「${input.workspaceName}」への招待が届いています。\n` +
    "参加するには、以下のリンクを開いてください。\n\n" +
    `${input.inviteUrl}\n\n` +
    `この招待リンクの有効期限は ${expiryHours} 時間です。\n` +
    `このメールは ${input.toEmail} 宛に送信されています。\n\n` +
    "心当たりがない場合は、このメールを破棄してください。\n"
  );
}

function buildHtmlTemplate(input: SendWorkspaceInviteMailInput, expiryHours: number) {
  const inviteeName = input.inviteeName?.trim() || "ユーザー";
  return [
    `<p>${inviteeName} さん</p>`,
    `<p>${input.inviterName} さんから、ワークスペース「<strong>${input.workspaceName}</strong>」への招待が届いています。</p>`,
    `<p><a href="${input.inviteUrl}" target="_blank" rel="noopener noreferrer">ワークスペースに参加する</a></p>`,
    `<p>この招待リンクの有効期限は <strong>${expiryHours} 時間</strong> です。</p>`,
    `<p>このメールは ${input.toEmail} 宛に送信されています。</p>`,
    "<p>心当たりがない場合は、このメールを破棄してください。</p>",
  ].join("");
}

export async function sendWorkspaceInviteMail(
  input: SendWorkspaceInviteMailInput,
): Promise<SendWorkspaceInviteMailResult> {
  const sendEnabled = env("MAIL_SEND_ENABLED");
  if (sendEnabled.toLowerCase() !== "true") {
    return { status: "skipped", reason: "MAIL_SEND_ENABLED is not true" };
  }

  const apiKey = env("RESEND_API_KEY");
  const from = env("MAIL_FROM");
  const replyTo = env("MAIL_REPLY_TO");
  if (!apiKey) return { status: "skipped", reason: "RESEND_API_KEY is missing" };
  if (!from) return { status: "skipped", reason: "MAIL_FROM is missing" };

  const expiryHours = resolveInviteExpiryHours();
  const resend = new Resend(apiKey);
  const subject = `[TaskHub Todo] ワークスペース「${input.workspaceName}」への招待`;

  const result = await resend.emails.send({
    from,
    to: input.toEmail,
    replyTo: replyTo || undefined,
    subject,
    text: buildTextTemplate(input, expiryHours),
    html: buildHtmlTemplate(input, expiryHours),
  });

  if (result.error) {
    throw new Error(`Failed to send invite mail: ${result.error.message}`);
  }

  return { status: "sent", providerMessageId: result.data?.id ?? null };
}