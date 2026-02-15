import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import type { AppUserRole } from "@/lib/user-role";

export async function getAuthenticatedUserId() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return null;
  return userId;
}

export async function getAuthenticatedUser() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return null;

  return {
    userId,
    role: (session.user.role ?? "USER") as AppUserRole,
  };
}
