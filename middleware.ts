import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const authSecret =
    process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? process.env.AUTHJS_SECRET;
  const readToken = async () => {
    try {
      return await getToken({ req: request, secret: authSecret });
    } catch {
      return null;
    }
  };

  if (pathname.startsWith("/api/auth/")) {
    return NextResponse.next();
  }
  if (pathname.startsWith("/api/cron/")) {
    return NextResponse.next();
  }
  if (pathname === "/login" || pathname === "/register") {
    const token = await readToken();
    if (token?.userId) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  const token = await readToken();
  if (!token?.userId) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (pathname.startsWith("/admin")) {
    if (token.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  if (pathname.startsWith("/api/admin/")) {
    if (token.role !== "ADMIN") {
      return NextResponse.json({ message: "Forbidden." }, { status: 403 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)",
  ],
};
