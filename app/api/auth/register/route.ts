import { NextResponse } from "next/server";
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
  try {
    const body = (await request.json()) as RegisterInput;
    const email = normalizeEmail(body.email);
    const password = parsePassword(body.password);
    const displayName = parseDisplayName(body.displayName);

    if (!email || !password) {
      return NextResponse.json(
        { message: "email と password(8文字以上)は必須です。" },
        { status: 400 },
      );
    }

    const exists = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (exists) {
      return NextResponse.json(
        { message: "この email は既に使われています。" },
        { status: 409 },
      );
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

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    console.error("POST /api/auth/register failed:", error);
    return NextResponse.json({ message: "ユーザー作成に失敗しました。" }, { status: 500 });
  }
}
