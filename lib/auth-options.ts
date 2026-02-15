import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { ensureAdminUser } from "@/lib/admin-user";
import { verifyPasswordHash } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { getRoleByUserId } from "@/lib/user-role";

export const authOptions: NextAuthOptions = {
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV !== "production",
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const email =
          typeof credentials?.email === "string"
            ? credentials.email.trim().toLowerCase()
            : "";
        const password =
          typeof credentials?.password === "string"
            ? credentials.password
            : "";

        if (!email || !password) {
          return null;
        }

        try {
          await ensureAdminUser();
        } catch (error) {
          // Admin bootstrap failure should not block normal user login.
          console.error("[auth] ensureAdminUser error", error);
        }

        try {
          const user = await prisma.user.findUnique({
            where: { email },
          });
          if (!user) {
            return null;
          }

          if (!verifyPasswordHash(password, user.passwordHash)) {
            return null;
          }

          const role = await getRoleByUserId(user.id, user.email);

          return {
            id: user.id,
            name: user.displayName ?? user.email,
            email: user.email,
            role,
          };
        } catch (error) {
          console.error("[auth] authorize error", error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user?.id) {
        token.userId = user.id;
        token.role = (user as { role?: unknown }).role === "ADMIN" ? "ADMIN" : "USER";
      }
      return token;
    },
    session: async ({ session, token }) => {
      if (session.user && typeof token.userId === "string") {
        session.user.id = token.userId;
        session.user.role = token.role === "ADMIN" ? "ADMIN" : "USER";
      }
      return session;
    },
  },
};
