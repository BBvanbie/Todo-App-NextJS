import { prisma } from "@/lib/prisma";
import { createPasswordHash, verifyPasswordHash } from "@/lib/password";
import { ensureAdminRole } from "@/lib/user-role";

let bootstrappedAdminId: string | null = null;

function getAdminConfig() {
  const email = process.env.ADMIN_EMAIL?.trim();
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    return null;
  }

  return { email: email.toLowerCase(), password };
}

export async function ensureAdminUser() {
  const config = getAdminConfig();
  if (!config) {
    return null;
  }

  const existing = await prisma.user.findUnique({
    where: { email: config.email },
  });

  let adminUser = existing;
  if (!adminUser) {
    adminUser = await prisma.user.create({
      data: {
        email: config.email,
        passwordHash: createPasswordHash(config.password),
        displayName: "admin",
      },
    });
  } else if (!verifyPasswordHash(config.password, adminUser.passwordHash)) {
    adminUser = await prisma.user.update({
      where: { id: adminUser.id },
      data: { passwordHash: createPasswordHash(config.password) },
    });
  }

  if (bootstrappedAdminId !== adminUser.id) {
    await prisma.todo.updateMany({
      where: { userId: null },
      data: { userId: adminUser.id },
    });
    await prisma.notification.updateMany({
      where: { userId: null },
      data: { userId: adminUser.id },
    });
    await prisma.todoEditHistory.updateMany({
      where: { userId: null },
      data: { userId: adminUser.id },
    });

    bootstrappedAdminId = adminUser.id;
  }

  await ensureAdminRole(adminUser.id);

  return adminUser;
}
