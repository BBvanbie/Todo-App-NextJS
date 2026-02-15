import { errorJson, getRequestId, okJson } from "@/lib/api-response";
import { createPasswordHash } from "@/lib/password";
import { prisma } from "@/lib/prisma";

type RegisterInput = {
  email?: unknown;
  password?: unknown;
  displayName?: unknown;
};

function normalizeEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  if (!email) return null;
  return email;
}

function parsePassword(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const password = value.trim();
  if (password.length < 8) return null;
  return password;
}

function parseDisplayName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed;
}

export async function POST(request: Request) {
  const requestId = getRequestId(request);

  try {
    const body = (await request.json()) as RegisterInput;
    const email = normalizeEmail(body.email);
    const password = parsePassword(body.password);
    const displayName = parseDisplayName(body.displayName);

    if (!email || !password) {
      return errorJson({
        status: 400,
        code: "INVALID_REGISTER_INPUT",
        message: "email と password(8文字以上)は必須です。",
        requestId,
      });
    }

    const exists = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (exists) {
      return errorJson({
        status: 409,
        code: "EMAIL_ALREADY_EXISTS",
        message: "この email は既に使われています。",
        requestId,
      });
    }

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: createPasswordHash(password),
        displayName: displayName ?? email,
      },
      select: {
        id: true,
        email: true,
        displayName: true,
        createdAt: true,
      },
    });

    return okJson(user, { status: 201, requestId });
  } catch (error) {
    console.error(`[${requestId}] POST /api/auth/register failed:`, error);
    return errorJson({
      status: 500,
      code: "REGISTER_FAILED",
      message: "ユーザー作成に失敗しました。",
      requestId,
    });
  }
}
