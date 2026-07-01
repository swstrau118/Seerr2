import type { MediaItem } from "@prisma/client";
import { prisma } from "./db";
import {
  getMovieDetails,
  getTvDetails,
  getTvSeasonEpisodes,
  type MediaType,
} from "./tmdb";
import { grabEpisode } from "./engine";

export async function getLibraryItem(tmdbId: number, type: MediaType) {
  return prisma.mediaItem.findUnique({
    where: { tmdbId_type: { tmdbId, type } },
    include: {
      episodes: { orderBy: [{ season: "asc" }, { number: "asc" }] },
      downloads: { orderBy: { createdAt: "desc" } },
    },
  });
}

export async function ensureMovieItem(tmdbId: number): Promise<MediaItem> {
  const existing = await prisma.mediaItem.findUnique({
    where: { tmdbId_type: { tmdbId, type: "movie" } },
  });
  if (existing) return existing;

  const d = await getMovieDetails(tmdbId);
  return prisma.mediaItem.create({
    data: {
      tmdbId,
      type: "movie",
      title: d.title,
      year: d.year,
      overview: d.overview,
      posterPath: d.posterPath,
      backdropPath: d.backdropPath,
      status: "wanted",
      monitored: true,
    },
  });
}

/**
 * Create (or update) a TV MediaItem and its episodes for the requested seasons.
 * `seasons` defaults to every real season.
 */
export async function ensureTvItem(
  tmdbId: number,
  seasons?: number[],
): Promise<MediaItem> {
  const details = await getTvDetails(tmdbId);

  const item = await prisma.mediaItem.upsert({
    where: { tmdbId_type: { tmdbId, type: "tv" } },
    update: {},
    create: {
      tmdbId,
      type: "tv",
      title: details.title,
      year: details.year,
      overview: details.overview,
      posterPath: details.posterPath,
      backdropPath: details.backdropPath,
      status: "wanted",
      monitored: true,
    },
  });

  const wantSeasons =
    seasons && seasons.length > 0
      ? details.seasons.filter((s) => seasons.includes(s.season))
      : details.seasons;

  for (const season of wantSeasons) {
    const episodes = await getTvSeasonEpisodes(tmdbId, season.season);
    for (const ep of episodes) {
      await prisma.episode.upsert({
        where: {
          mediaItemId_season_number: {
            mediaItemId: item.id,
            season: ep.season,
            number: ep.number,
          },
        },
        update: { title: ep.title, airDate: ep.airDate ? new Date(ep.airDate) : null },
        create: {
          mediaItemId: item.id,
          season: ep.season,
          number: ep.number,
          title: ep.title,
          airDate: ep.airDate ? new Date(ep.airDate) : null,
          monitored: true,
          state: "missing",
        },
      });
    }
  }

  return item;
}

/** Immediately grab all already-aired, still-missing episodes of a show. */
export async function backfillShow(itemId: number): Promise<void> {
  const episodes = await prisma.episode.findMany({
    where: {
      mediaItemId: itemId,
      monitored: true,
      state: "missing",
      airDate: { lte: new Date() },
    },
  });
  for (const ep of episodes) {
    await grabEpisode(ep.id).catch((e) =>
      console.error(`[backfill] ep ${ep.id}`, e),
    );
  }
}

export async function removeItem(id: number): Promise<void> {
  await prisma.mediaItem.delete({ where: { id } });
}
