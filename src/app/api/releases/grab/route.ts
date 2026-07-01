import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSettings, isConfigured } from "@/lib/settings";
import { ensureMovieItem, ensureTvItem } from "@/lib/library";
import { grabRelease } from "@/lib/engine";
import type { Release } from "@/lib/providers/types";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const tmdbId = Number(body.tmdbId);
  const type = body.type === "tv" ? "tv" : "movie";
  if (!tmdbId || !body.magnet) {
    return NextResponse.json({ ok: false, reason: "Missing tmdbId or magnet" }, { status: 400 });
  }

  const settings = await getSettings();
  if (!isConfigured(settings)) {
    return NextResponse.json({ ok: false, reason: "App is not configured yet." }, { status: 400 });
  }

  const release: Release = {
    title: body.releaseTitle ?? "Manual selection",
    parsedTitle: body.releaseTitle ?? "Manual selection",
    parsedYear: null,
    magnet: body.magnet,
    infoHash: body.infoHash ?? null,
    sizeGB: Number(body.sizeGB) || 0,
    seeders: Number(body.seeders) || 0,
    leechers: 0,
    provider: body.provider ?? "manual",
    quality: body.quality ?? "1080p",
    codec: "",
    releaseSource: "unknown",
    isHevc: false,
    isCam: false,
    season: body.season ?? null,
    episode: body.episode ?? null,
  };

  try {
    if (type === "movie") {
      const item = await ensureMovieItem(tmdbId);
      await grabRelease(item, release, null, settings);
    } else {
      const season = Number(body.season);
      const item = await ensureTvItem(tmdbId, Number.isFinite(season) ? [season] : undefined);
      const episode =
        body.season != null && body.episode != null
          ? await prisma.episode.findUnique({
              where: {
                mediaItemId_season_number: {
                  mediaItemId: item.id,
                  season: Number(body.season),
                  number: Number(body.episode),
                },
              },
            })
          : null;
      await grabRelease(item, release, episode, settings);
    }
    return NextResponse.json({ ok: true, reason: "Sent to qBittorrent." });
  } catch (e) {
    const reason = e instanceof Error ? e.message : "Grab failed";
    return NextResponse.json({ ok: false, reason }, { status: 500 });
  }
}
