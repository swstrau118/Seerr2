import { NextResponse } from "next/server";
import { grabEpisode } from "@/lib/engine";

export const dynamic = "force-dynamic";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const episodeId = Number(id);
  if (!episodeId) {
    return NextResponse.json({ ok: false, reason: "Invalid id" }, { status: 400 });
  }
  const result = await grabEpisode(episodeId);
  return NextResponse.json(result);
}
