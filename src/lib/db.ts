import path from "path";
import { PrismaClient } from "@prisma/client";

/** Ensure Prisma always has a DB URL (common on Windows when .env wasn't copied). */
function ensureDatabaseUrl(): void {
  if (process.env.DATABASE_URL) return;
  const dbPath = path.join(process.cwd(), "prisma", "data", "seerr2.db");
  process.env.DATABASE_URL = `file:${dbPath.replace(/\\/g, "/")}`;
}

ensureDatabaseUrl();

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
