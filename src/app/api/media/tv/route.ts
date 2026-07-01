import { NextResponse } from "next/server";
import { ensureTvItem, backfillShow } from "@/lib/library";
import { logActivity } from "@/lib/activity";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const tmdbId = Number(body.tmdbId);
  if (!tmdbId) {
    return NextResponse.json({ ok: false, reason: "Missing tmdbId" }, { status: 400 });
  }
  const seasons: number[] | undefined = Array.isArray(body.seasons)
    ? body.seasons.map(Number).filter((n: number) => Number.isFinite(n))
    : undefined;

  try {
    const item = await ensureTvItem(tmdbId, seasons);
    await logActivity(`Monitoring "${item.title}"`, "info");
    // Kick off backfill of already-aired episodes in the background.
    backfillShow(item.id).catch((e) => console.error("[tv backfill]", e));
    return NextResponse.json({ ok: true, reason: "Monitoring started; searching aired episodes." });
  } catch (e) {
    const reason = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ ok: false, reason }, { status: 500 });
  }
}
