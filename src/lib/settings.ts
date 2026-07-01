import { prisma } from "./db";
import type { Setting } from "@prisma/client";

/**
 * Returns the single Setting row, creating it (seeded from env) on first use.
 */
export async function getSettings(): Promise<Setting> {
  const existing = await prisma.setting.findUnique({ where: { id: 1 } });
  if (existing) return existing;

  return prisma.setting.create({
    data: {
      id: 1,
      tmdbApiKey: process.env.TMDB_API_KEY ?? "",
    },
  });
}

export type SettingsUpdate = Partial<
  Omit<Setting, "id" | "updatedAt">
>;

export async function updateSettings(data: SettingsUpdate): Promise<Setting> {
  await getSettings();
  return prisma.setting.update({ where: { id: 1 }, data });
}

/** True when the minimum config needed to actually download is present. */
export function isConfigured(s: Setting): boolean {
  return Boolean(
    s.tmdbApiKey &&
      s.qbtHost &&
      s.qbtPort &&
      s.downloadDir &&
      (s.movieLibraryDir || s.tvLibraryDir),
  );
}

export function allowedTiers(s: Setting): string[] {
  return s.allowedTiers
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
}
