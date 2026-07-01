import { NextResponse } from "next/server";
import { ensureMovieItem } from "@/lib/library";
import { grabMovie } from "@/lib/engine";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const tmdbId = Number(body.tmdbId);
  if (!tmdbId) {
    return NextResponse.json({ ok: false, reason: "Missing tmdbId" }, { status: 400 });
  }

  try {
    const item = await ensureMovieItem(tmdbId);
    const result = await grabMovie(item.id);
    return NextResponse.json(result);
  } catch (e) {
    const reason = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ ok: false, reason }, { status: 500 });
  }
}
