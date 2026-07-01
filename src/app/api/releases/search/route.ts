import { NextResponse } from "next/server";
import { searchAndRank } from "@/lib/engine";
import { getMovieDetails, getTvDetails } from "@/lib/tmdb";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const tmdbId = Number(body.tmdbId);
  const type = body.type === "tv" ? "tv" : "movie";
  if (!tmdbId) {
    return NextResponse.json({ error: "Missing tmdbId" }, { status: 400 });
  }

  let title: string | undefined = body.title;
  let year: number | null = body.year ?? null;
  if (!title) {
    try {
      const d = type === "movie" ? await getMovieDetails(tmdbId) : await getTvDetails(tmdbId);
      title = d.title;
      year = d.year;
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "TMDB lookup failed" },
        { status: 500 },
      );
    }
  }

  const episode =
    body.season != null && body.episode != null
      ? { season: Number(body.season), number: Number(body.episode) }
      : null;

  try {
    const { pick } = await searchAndRank(
      { tmdbId, title: title!, year, type },
      episode,
    );
    return NextResponse.json({
      reason: pick.reason,
      chosenInfoHash: pick.chosen?.infoHash ?? null,
      releases: pick.ranked.slice(0, 50),
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Search failed" },
      { status: 500 },
    );
  }
}
