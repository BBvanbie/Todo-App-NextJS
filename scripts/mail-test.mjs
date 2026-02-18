import path from "node:path";
import dotenv from "dotenv";
import { Resend } from "resend";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

function env(name) {
  return (process.env[name] || "").trim();
}

async function main() {
  const to = (process.argv[2] || "").trim();
  if (!to || !to.includes("@")) {
    console.error("Usage: npm run mail:test -- you@example.com");
    process.exit(1);
  }

  const apiKey = env("RESEND_API_KEY");
  const from = env("MAIL_FROM");
  const replyTo = env("MAIL_REPLY_TO");

  if (!apiKey) {
    console.error("RESEND_API_KEY is missing in .env.local");
    process.exit(1);
  }
  if (!from) {
    console.error("MAIL_FROM is missing in .env.local");
    process.exit(1);
  }

  const resend = new Resend(apiKey);
  const now = new Date().toISOString();

  const result = await resend.emails.send({
    from,
    to,
    replyTo: replyTo || undefined,
    subject: `[TaskHub Todo] Resend test mail (${now})`,
    text: [
      "This is a test email from TaskHub Todo.",
      `Time: ${now}`,
      `From: ${from}`,
      `Reply-To: ${replyTo || "(not set)"}`,
    ].join("\n"),
    html: [
      "<p>This is a test email from <strong>TaskHub Todo</strong>.</p>",
      `<p>Time: ${now}</p>`,
      `<p>From: ${from}</p>`,
      `<p>Reply-To: ${replyTo || "(not set)"}</p>`,
    ].join(""),
  });

  if (result.error) {
    console.error(`Send failed: ${result.error.message}`);
    process.exit(1);
  }

  console.log("Send succeeded.");
  console.log(`Message ID: ${result.data?.id || "(none)"}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
