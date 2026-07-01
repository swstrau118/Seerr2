import { NextResponse } from "next/server";
import { pollDownloads } from "@/lib/engine";

export const dynamic = "force-dynamic";

/** Manually trigger a download poll (the scheduler also runs this every 30s). */
export async function POST() {
  await pollDownloads().catch((e) => console.error("[poll route]", e));
  return NextResponse.json({ ok: true });
}
