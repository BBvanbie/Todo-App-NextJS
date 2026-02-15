import { prisma } from "@/lib/prisma";

export type AppUserRole = "ADMIN" | "USER";

function getAdminEmail() {
  return process.env.ADMIN_EMAIL?.trim().toLowerCase() ?? "";
}

export function fallbackRoleByEmail(email: string): AppUserRole {
  const adminEmail = getAdminEmail();
  if (adminEmail && email.toLowerCase() === adminEmail) {
    return "ADMIN";
  }
  return "USER";
}

export async function getRoleByUserId(
  userId: string,
  fallbackEmail?: string,
): Promise<AppUserRole> {
  try {
    const rows = await prisma.$queryRaw<Array<{ role: AppUserRole }>>`
      SELECT "role"::text AS "role"
      FROM "User"
      WHERE "id" = ${userId}
      LIMIT 1
    `;
    const role = rows[0]?.role;
    if (role === "ADMIN" || role === "USER") {
      return role;
    }
  } catch {
    // Role column may not exist yet during rollout.
  }

  if (fallbackEmail) {
    return fallbackRoleByEmail(fallbackEmail);
  }
  return "USER";
}

export async function ensureAdminRole(userId: string) {
  try {
    await prisma.$executeRaw`
      UPDATE "User"
      SET "role" = 'ADMIN'
      WHERE "id" = ${userId}
    `;
  } catch {
    // Ignore before role migration is applied.
  }
}
