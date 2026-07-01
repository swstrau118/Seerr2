import { NextResponse } from "next/server";
import { getSettings, updateSettings, type SettingsUpdate } from "@/lib/settings";

export const dynamic = "force-dynamic";

export async function GET() {
  const s = await getSettings();
  // Never send the stored password to the client.
  const { qbtPassword, ...rest } = s;
  return NextResponse.json({ ...rest, hasPassword: Boolean(qbtPassword) });
}

const STRING_FIELDS = [
  "tmdbApiKey",
  "qbtHost",
  "qbtUsername",
  "qbtPassword",
  "qbtCategory",
  "downloadDir",
  "movieLibraryDir",
  "tvLibraryDir",
  "qualityTarget",
  "allowedTiers",
] as const;
const INT_FIELDS = ["qbtPort", "minSeeders", "monitorIntervalMin"] as const;
const FLOAT_FIELDS = [
  "idealMovieSize1080",
  "idealMovieSize720",
  "idealMovieSize2160",
  "idealEpisodeSize",
  "sizeWeight",
  "healthWeight",
  "hevcBonus",
] as const;

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const update: SettingsUpdate = {};

  for (const f of STRING_FIELDS) {
    if (typeof body[f] === "string") {
      // Don't overwrite the password with an empty string.
      if (f === "qbtPassword" && body[f] === "") continue;
      (update as Record<string, unknown>)[f] = body[f];
    }
  }
  for (const f of INT_FIELDS) {
    if (body[f] !== undefined && body[f] !== "") {
      (update as Record<string, unknown>)[f] = Math.round(Number(body[f]));
    }
  }
  for (const f of FLOAT_FIELDS) {
    if (body[f] !== undefined && body[f] !== "") {
      (update as Record<string, unknown>)[f] = Number(body[f]);
    }
  }
  if (typeof body.useHardlinks === "boolean") update.useHardlinks = body.useHardlinks;

  const saved = await updateSettings(update);
  const { qbtPassword, ...rest } = saved;
  return NextResponse.json({ ...rest, hasPassword: Boolean(qbtPassword) });
}
