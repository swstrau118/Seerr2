import type { Episode, MediaItem, Setting } from "@prisma/client";
import { prisma } from "./db";
import { getSettings, isConfigured } from "./settings";
import { getImdbId } from "./tmdb";
import { searchReleases } from "./providers";
import type { Release } from "./providers/types";
import { filterRelevant } from "./relevance";
import { pickBest, type PickResult } from "./picker";
import { QbtClient, isComplete, isErrored } from "./qbittorrent";
import { importDownload } from "./importer";
import { logActivity } from "./activity";

// Mark a download that never registers/progresses as failed after this long.
const STALL_MS = 45 * 60 * 1000;

// Prevent overlapping poll runs (node-cron does not serialize executions).
let polling = false;

function magnetHash(magnet: string): string {
  const m = magnet.match(/btih:([a-zA-Z0-9]+)/i);
  return m ? m[1].toLowerCase() : "";
}

export interface Searchable {
  tmdbId: number;
  title: string;
  year: number | null;
  type: "movie" | "tv";
}

/** Search + rank releases for a movie or a specific episode (no side effects). */
export async function searchAndRank(
  item: Searchable,
  episode?: { season: number; number: number } | null,
): Promise<{ pick: PickResult; releases: Release[] }> {
  const settings = await getSettings();
  const imdbId = await getImdbId(item.tmdbId, item.type);

  const query = {
    title: item.title,
    year: item.year,
    imdbId,
    type: item.type,
    season: episode?.season,
    episode: episode?.number,
  };
  let releases = await searchReleases(query);

  // Keep only releases that actually match this title/year/episode.
  releases = filterRelevant(releases, query);

  // Drop blacklisted (previously-failed) releases.
  const blacklist = new Set(
    (await prisma.blacklist.findMany({ select: { key: true } })).map((b) => b.key),
  );
  releases = releases.filter(
    (r) => !r.infoHash || !blacklist.has(r.infoHash),
  );

  const pick = pickBest(releases, settings, {
    type: item.type,
    isEpisode: Boolean(episode),
  });
  return { pick, releases };
}

/** Send a chosen release to qBittorrent and record the download. */
export async function grabRelease(
  item: MediaItem,
  release: Release,
  episode: Episode | null,
  settings: Setting,
): Promise<void> {
  if (!release.magnet) throw new Error("Release has no magnet link.");

  const qbt = QbtClient.fromSettings(settings);
  await qbt.ensureCategory(settings.qbtCategory, settings.downloadDir);
  await qbt.addMagnet(release.magnet, {
    category: settings.qbtCategory,
    savePath: settings.downloadDir || undefined,
  });

  const hash = (release.infoHash ?? magnetHash(release.magnet)) || "";

  await prisma.download.create({
    data: {
      mediaItemId: item.id,
      episodeId: episode?.id ?? null,
      hash,
      releaseTitle: release.title,
      magnet: release.magnet,
      sizeGB: release.sizeGB,
      seeders: release.seeders,
      quality: release.quality,
      state: "downloading",
    },
  });

  if (episode) {
    await prisma.episode.update({
      where: { id: episode.id },
      data: { state: "downloading" },
    });
    await prisma.mediaItem.update({
      where: { id: item.id },
      data: { status: "downloading" },
    });
  } else {
    await prisma.mediaItem.update({
      where: { id: item.id },
      data: { status: "downloading" },
    });
  }

  await logActivity(
    `Grabbed "${release.title}" (${release.sizeGB.toFixed(2)}GB, ${release.seeders} seeders) for ${item.title}`,
    "success",
  );
}

/** Auto-pick + grab the best release for a movie. */
export async function grabMovie(itemId: number): Promise<{ ok: boolean; reason: string }> {
  const settings = await getSettings();
  if (!isConfigured(settings)) return { ok: false, reason: "App is not configured yet." };

  const item = await prisma.mediaItem.findUnique({ where: { id: itemId } });
  if (!item) return { ok: false, reason: "Movie not found." };

  await prisma.mediaItem.update({ where: { id: itemId }, data: { status: "searching" } });
  try {
    const { pick } = await searchAndRank({
      tmdbId: item.tmdbId,
      title: item.title,
      year: item.year,
      type: "movie",
    });

    if (!pick.chosen) {
      await prisma.mediaItem.update({ where: { id: itemId }, data: { status: "wanted" } });
      await logActivity(`No suitable release for "${item.title}": ${pick.reason}`, "warn");
      return { ok: false, reason: pick.reason };
    }

    await grabRelease(item, pick.chosen, null, settings);
    return { ok: true, reason: pick.reason };
  } catch (e) {
    const reason = e instanceof Error ? e.message : "Grab failed";
    await prisma.mediaItem.update({ where: { id: itemId }, data: { status: "wanted" } });
    await logActivity(`Grab failed for "${item.title}": ${reason}`, "error");
    return { ok: false, reason };
  }
}

/** Auto-pick + grab the best release for one episode. */
export async function grabEpisode(episodeId: number): Promise<{ ok: boolean; reason: string }> {
  const settings = await getSettings();
  if (!isConfigured(settings)) return { ok: false, reason: "App is not configured yet." };

  const episode = await prisma.episode.findUnique({
    where: { id: episodeId },
    include: { mediaItem: true },
  });
  if (!episode) return { ok: false, reason: "Episode not found." };

  await prisma.episode.update({ where: { id: episodeId }, data: { state: "searching" } });
  try {
    const { pick } = await searchAndRank(
      {
        tmdbId: episode.mediaItem.tmdbId,
        title: episode.mediaItem.title,
        year: episode.mediaItem.year,
        type: "tv",
      },
      { season: episode.season, number: episode.number },
    );

    if (!pick.chosen) {
      await prisma.episode.update({ where: { id: episodeId }, data: { state: "missing" } });
      return { ok: false, reason: pick.reason };
    }

    await grabRelease(episode.mediaItem, pick.chosen, episode, settings);
    return { ok: true, reason: pick.reason };
  } catch (e) {
    const reason = e instanceof Error ? e.message : "Grab failed";
    await prisma.episode.update({ where: { id: episodeId }, data: { state: "missing" } });
    await logActivity(
      `Grab failed for "${episode.mediaItem.title}" S${episode.season}E${episode.number}: ${reason}`,
      "error",
    );
    return { ok: false, reason };
  }
}

/**
 * Poll qBittorrent for all active downloads: update progress, import completed
 * ones into the library, and flag failures.
 */
export async function pollDownloads(): Promise<void> {
  if (polling) return;
  polling = true;
  try {
    await pollDownloadsInner();
  } finally {
    polling = false;
  }
}

/** Reset the parent item/episode when a download fails, so nothing gets stuck. */
async function revertAfterFailure(dl: {
  mediaItemId: number;
  episodeId: number | null;
}): Promise<void> {
  if (dl.episodeId) {
    await prisma.episode.update({
      where: { id: dl.episodeId },
      data: { state: "missing" },
    });
    await recomputeTvStatus(dl.mediaItemId);
  } else {
    await prisma.mediaItem.update({
      where: { id: dl.mediaItemId },
      data: { status: "wanted" },
    });
  }
}

async function pollDownloadsInner(): Promise<void> {
  const settings = await getSettings();
  if (!isConfigured(settings)) return;

  const active = await prisma.download.findMany({
    where: { state: { in: ["queued", "downloading", "importing"] } },
    include: { mediaItem: true, episode: true },
  });
  if (active.length === 0) return;

  const qbt = QbtClient.fromSettings(settings);
  let torrents;
  try {
    torrents = await qbt.torrents({ category: settings.qbtCategory });
  } catch (e) {
    console.error("[poll] qBittorrent unreachable:", e);
    return;
  }
  const byHash = new Map(torrents.map((t) => [t.hash.toLowerCase(), t]));

  for (const dl of active) {
    const t = dl.hash ? byHash.get(dl.hash.toLowerCase()) : undefined;

    // Not registered in qBittorrent (still resolving metadata, or removed).
    if (!t) {
      const age = Date.now() - dl.createdAt.getTime();
      if (age > STALL_MS) {
        await prisma.download.update({
          where: { id: dl.id },
          data: { state: "failed", error: "Torrent never registered / no metadata." },
        });
        await revertAfterFailure(dl);
        await logActivity(`Download stalled (no metadata): ${dl.releaseTitle}`, "error");
      }
      continue;
    }

    if (isErrored(t)) {
      await prisma.download.update({
        where: { id: dl.id },
        data: { state: "failed", error: `qBittorrent state: ${t.state}` },
      });
      if (dl.hash) {
        await prisma.blacklist
          .create({ data: { key: dl.hash, reason: "download error" } })
          .catch(() => {});
      }
      await revertAfterFailure(dl);
      await logActivity(`Download failed: ${dl.releaseTitle}`, "error");
      continue;
    }

    if (isComplete(t)) {
      // Already importing (or imported): never re-enter the import path.
      if (dl.state === "importing") continue;
      // Completed but qBittorrent hasn't reported the file path yet — wait.
      if (!t.content_path) continue;

      await prisma.download.update({
        where: { id: dl.id },
        data: { state: "importing", progress: 1, seeders: t.num_seeds },
      });
      try {
        const result = await importDownload(
          {
            contentPath: t.content_path,
            type: dl.mediaItem.type as "movie" | "tv",
            title: dl.mediaItem.title,
            year: dl.mediaItem.year,
            quality: dl.quality,
            season: dl.episode?.season ?? null,
            episode: dl.episode?.number ?? null,
          },
          settings,
        );
        await prisma.download.update({ where: { id: dl.id }, data: { state: "done" } });
        if (dl.episodeId) {
          await prisma.episode.update({
            where: { id: dl.episodeId },
            data: { state: "available" },
          });
          await recomputeTvStatus(dl.mediaItemId);
        } else {
          await prisma.mediaItem.update({
            where: { id: dl.mediaItemId },
            data: { status: "available" },
          });
        }
        await logActivity(
          `Imported "${dl.mediaItem.title}" (${result.method}) -> ${result.destination}`,
          "success",
        );
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        await prisma.download.update({
          where: { id: dl.id },
          data: { state: "failed", error: msg },
        });
        await revertAfterFailure(dl);
        await logActivity(`Import failed for ${dl.mediaItem.title}: ${msg}`, "error");
      }
      continue;
    }

    await prisma.download.update({
      where: { id: dl.id },
      data: { progress: t.progress, seeders: t.num_seeds, state: "downloading" },
    });
  }
}

/** For every monitored show, grab aired episodes that are still missing. */
export async function monitorTv(): Promise<void> {
  const settings = await getSettings();
  if (!isConfigured(settings)) return;

  const shows = await prisma.mediaItem.findMany({
    where: { type: "tv", monitored: true },
    include: {
      episodes: {
        where: {
          monitored: true,
          state: "missing",
          airDate: { lte: new Date() },
        },
      },
    },
  });

  for (const show of shows) {
    for (const ep of show.episodes) {
      try {
        await grabEpisode(ep.id);
      } catch (e) {
        console.error(`[monitor] grab failed for ${show.title} ep ${ep.id}:`, e);
      }
    }
  }
}

export async function recomputeTvStatus(mediaItemId: number): Promise<void> {
  const episodes = await prisma.episode.findMany({
    where: { mediaItemId, monitored: true, airDate: { lte: new Date() } },
  });
  if (episodes.length === 0) return;
  const available = episodes.filter((e) => e.state === "available").length;
  const downloading = episodes.some((e) => e.state === "downloading");
  const status =
    available === episodes.length
      ? "available"
      : downloading
        ? "downloading"
        : available > 0
          ? "partial"
          : "wanted";
  await prisma.mediaItem.update({ where: { id: mediaItemId }, data: { status } });
}
