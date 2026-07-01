import { NextResponse } from "next/server";
import { getSettings } from "@/lib/settings";
import { QbtClient } from "@/lib/qbittorrent";

export const dynamic = "force-dynamic";

/**
 * Test qBittorrent connectivity. Uses values from the request body when
 * provided (so the user can test before saving); otherwise the saved settings.
 * If the password field is omitted/empty, falls back to the stored password.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const saved = await getSettings();

  const client = new QbtClient({
    host: body.qbtHost || saved.qbtHost,
    port: Number(body.qbtPort) || saved.qbtPort,
    username: body.qbtUsername ?? saved.qbtUsername,
    password: body.qbtPassword ? body.qbtPassword : saved.qbtPassword,
  });

  const result = await client.testConnection();
  return NextResponse.json(result);
}
