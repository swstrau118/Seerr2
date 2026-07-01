import type { Setting } from "@prisma/client";
import { clamp } from "./utils";
import type { QualityTier, Release } from "./providers/types";

const HEALTHY_CAP = 50; // seeders beyond this add little confidence

export interface PickContext {
  type: "movie" | "tv";
  isEpisode: boolean; // true for single-episode searches (tighter size bounds)
}

export interface PickResult {
  chosen: Release | null;
  ranked: Release[]; // every candidate, best-first, with score + reject info
  reason: string;
}

const TIER_ORDER: Record<string, QualityTier[]> = {
  efficient1080: ["1080p", "720p", "480p", "2160p", "sd"],
  balanced: ["1080p", "720p", "2160p", "480p", "sd"],
  max4k: ["2160p", "1080p", "720p", "480p", "sd"],
};

function tierPriority(settings: Setting): QualityTier[] {
  return TIER_ORDER[settings.qualityTarget] ?? TIER_ORDER.efficient1080;
}

function idealSizeGB(
  tier: QualityTier,
  settings: Setting,
  ctx: PickContext,
): number {
  if (ctx.type === "tv" && ctx.isEpisode) {
    const base = settings.idealEpisodeSize;
    switch (tier) {
      case "2160p":
        return base * 4;
      case "1080p":
        return base;
      case "720p":
        return base * 0.6;
      default:
        return base * 0.4;
    }
  }
  switch (tier) {
    case "2160p":
      return settings.idealMovieSize2160;
    case "1080p":
      return settings.idealMovieSize1080;
    case "720p":
      return settings.idealMovieSize720;
    case "480p":
      return 0.7;
    default:
      return 0.7;
  }
}

// Sane [min, max] size window (GB) to reject fakes and mislabels.
function sizeBounds(
  tier: QualityTier,
  ctx: PickContext,
): [number, number] {
  if (ctx.type === "tv") {
    // Generous upper bounds so season packs are not rejected.
    switch (tier) {
      case "2160p":
        return [0.4, 120];
      case "1080p":
        return [0.1, 60];
      case "720p":
        return [0.05, 40];
      default:
        return [0.02, 20];
    }
  }
  switch (tier) {
    case "2160p":
      return [8, 90];
    case "1080p":
      return [1.2, 30];
    case "720p":
      return [0.4, 10];
    default:
      return [0.2, 4];
  }
}

function healthScore(seeders: number): number {
  if (seeders <= 0) return 0;
  return clamp(Math.log2(1 + seeders) / Math.log2(1 + HEALTHY_CAP), 0, 1);
}

function sizeScore(sizeGB: number, ideal: number): number {
  if (sizeGB <= 0) return 0;
  // Rewards smaller files roughly linearly around the ideal:
  //   size == ideal      -> 1.0
  //   size == 2x ideal   -> 0.0
  //   size well below ideal -> capped at 1.5 (so ultra-small doesn't run away;
  //   the per-tier minimum size bound guards against junk).
  return clamp(2 - sizeGB / ideal, 0, 1.5);
}

/**
 * Core selection: filter junk, choose the highest-priority allowed quality tier
 * that has a healthy release, then rank within that tier by a blend of
 * size-efficiency and swarm health (with a small HEVC bonus).
 */
export function pickBest(
  releases: Release[],
  settings: Setting,
  ctx: PickContext,
): PickResult {
  const allowed = new Set(
    settings.allowedTiers.split(",").map((t) => t.trim().toLowerCase()),
  );
  const priority = tierPriority(settings);

  const scored: Release[] = releases.map((r) => {
    const ideal = idealSizeGB(r.quality, settings, ctx);
    const [min, max] = sizeBounds(r.quality, ctx);

    let rejected = false;
    let rejectReason = "";

    // Always reject dead swarms, even if the user sets minSeeders to 0.
    const minSeeders = Math.max(1, settings.minSeeders);

    if (r.isCam || r.releaseSource === "cam") {
      rejected = true;
      rejectReason = "cam/telesync";
    } else if (r.seeders < minSeeders) {
      rejected = true;
      rejectReason = `only ${r.seeders} seeders (min ${minSeeders})`;
    } else if (!allowed.has(r.quality)) {
      rejected = true;
      rejectReason = `${r.quality} not in allowed qualities`;
    } else if (r.sizeGB > 0 && (r.sizeGB < min || r.sizeGB > max)) {
      rejected = true;
      rejectReason = `size ${r.sizeGB.toFixed(1)}GB outside ${min}-${max}GB`;
    }

    const score =
      settings.sizeWeight * sizeScore(r.sizeGB, ideal) +
      settings.healthWeight * healthScore(r.seeders) +
      (r.isHevc ? settings.hevcBonus : 0);

    return { ...r, score: Number(score.toFixed(4)), rejected, rejectReason };
  });

  const eligible = scored.filter((r) => !r.rejected);

  // Pick the first tier (by priority) that has any eligible release.
  let chosen: Release | null = null;
  let chosenTier: QualityTier | null = null;
  for (const tier of priority) {
    const inTier = eligible.filter((r) => r.quality === tier);
    if (inTier.length > 0) {
      inTier.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
      chosen = inTier[0];
      chosenTier = tier;
      break;
    }
  }

  const ranked = rankForDisplay(scored, priority);

  const reason = chosen
    ? `Picked ${chosenTier} • ${chosen.sizeGB.toFixed(2)}GB • ${chosen.seeders} seeders • ${chosen.provider}`
    : eligible.length === 0
      ? "No releases passed the filters (seeders/quality/size)."
      : "No release matched the allowed quality tiers.";

  return { chosen, ranked, reason };
}

function rankForDisplay(scored: Release[], priority: QualityTier[]): Release[] {
  const tierRank = (t: QualityTier) => {
    const i = priority.indexOf(t);
    return i === -1 ? priority.length : i;
  };
  return [...scored].sort((a, b) => {
    if (a.rejected !== b.rejected) return a.rejected ? 1 : -1;
    const ta = tierRank(a.quality);
    const tb = tierRank(b.quality);
    if (ta !== tb) return ta - tb;
    return (b.score ?? 0) - (a.score ?? 0);
  });
}
