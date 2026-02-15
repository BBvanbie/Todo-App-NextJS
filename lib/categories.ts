import { prisma } from "@/lib/prisma";

export const BUILTIN_CATEGORIES = [
  "WORK",
  "PRIVATE",
  "PROCEDURE",
  "STUDY",
  "HEALTH",
  "SHOPPING",
  "OTHER",
] as const;

export const CATEGORY_LIMIT = 10;

let userCategoryTableReady = false;
let todoCategoryColumnReady = false;
let userBuiltinLabelTableReady = false;

const BUILTIN_LABELS: Record<string, string> = {
  WORK: "仕事",
  PRIVATE: "プライベート",
  PROCEDURE: "手続き",
  STUDY: "学習",
  HEALTH: "健康",
  SHOPPING: "買い物",
  OTHER: "その他",
};

export function isBuiltinCategory(value: string) {
  return BUILTIN_CATEGORIES.includes(value as (typeof BUILTIN_CATEGORIES)[number]);
}

export function getBuiltinDefaultLabelMap() {
  return { ...BUILTIN_LABELS };
}

export function toCategoryLabel(value: string, labelMap?: Record<string, string>) {
  if (labelMap && labelMap[value]) return labelMap[value];
  return BUILTIN_LABELS[value] ?? value;
}

export function normalizeCategoryInput(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length > 30) return null;
  return trimmed;
}

export async function ensureUserCategoryTable() {
  if (userCategoryTableReady) return;

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "UserCategory" (
      "id" SERIAL PRIMARY KEY,
      "userId" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "UserCategory_userId_name_key"
    ON "UserCategory"("userId", "name")
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "UserCategory_userId_idx"
    ON "UserCategory"("userId")
  `);

  userCategoryTableReady = true;
}

export async function ensureTodoCategoryColumnText() {
  if (todoCategoryColumnReady) return;

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "Todo"
      ALTER COLUMN "category" TYPE TEXT
      USING "category"::text
  `);

  todoCategoryColumnReady = true;
}

export async function ensureUserBuiltinLabelTable() {
  if (userBuiltinLabelTableReady) return;

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "UserBuiltinCategoryLabel" (
      "id" SERIAL PRIMARY KEY,
      "userId" TEXT NOT NULL,
      "builtinKey" TEXT NOT NULL,
      "label" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "UserBuiltinCategoryLabel_userId_builtinKey_key"
    ON "UserBuiltinCategoryLabel"("userId", "builtinKey")
  `);

  userBuiltinLabelTableReady = true;
}

export async function getUserBuiltinLabelMap(userId: string) {
  await ensureUserBuiltinLabelTable();

  const rows = await prisma.$queryRaw<Array<{ builtinKey: string; label: string }>>`
    SELECT "builtinKey", "label"
    FROM "UserBuiltinCategoryLabel"
    WHERE "userId" = ${userId}
  `;

  const map = getBuiltinDefaultLabelMap();
  for (const row of rows) {
    if (isBuiltinCategory(row.builtinKey)) {
      map[row.builtinKey] = row.label;
    }
  }
  return map;
}

export async function upsertUserBuiltinLabel(userId: string, builtinKey: string, label: string) {
  await ensureUserBuiltinLabelTable();

  await prisma.$executeRaw`
    INSERT INTO "UserBuiltinCategoryLabel" ("userId", "builtinKey", "label")
    VALUES (${userId}, ${builtinKey}, ${label})
    ON CONFLICT ("userId", "builtinKey")
    DO UPDATE SET
      "label" = EXCLUDED."label",
      "updatedAt" = NOW()
  `;
}

export async function getUserCustomCategories(userId: string) {
  await ensureUserCategoryTable();

  const rows = await prisma.$queryRaw<Array<{ id: number; name: string }>>`
    SELECT "id", "name"
    FROM "UserCategory"
    WHERE "userId" = ${userId}
    ORDER BY "createdAt" ASC, "id" ASC
  `;
  return rows;
}

export async function getAllowedCategories(userId: string) {
  const custom = await getUserCustomCategories(userId);
  return [...BUILTIN_CATEGORIES, ...custom.map((row) => row.name)];
}

export async function isAllowedCategory(userId: string, category: string) {
  if (isBuiltinCategory(category)) return true;

  await ensureUserCategoryTable();

  const rows = await prisma.$queryRaw<Array<{ exists: boolean }>>`
    SELECT EXISTS (
      SELECT 1
      FROM "UserCategory"
      WHERE "userId" = ${userId}
        AND lower("name") = lower(${category})
    ) AS "exists"
  `;
  return rows[0]?.exists ?? false;
}
