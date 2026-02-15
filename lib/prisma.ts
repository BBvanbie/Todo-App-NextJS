import { PrismaNeonHttp } from "@prisma/adapter-neon";
import { PrismaClient } from "@/src/generated/prisma";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

const adapter = new PrismaNeonHttp(process.env.DATABASE_URL!, {});

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
