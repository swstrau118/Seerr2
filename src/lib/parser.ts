import * as ptt from "parse-torrent-title";
import type { QualityTier, RawRelease, Release } from "./providers/types";

const HEVC = /(x265|h\.?265|hevc)/i;
// Deliberately specific to avoid false positives on titles like "Cam" or words
// containing "ts"/"tc". Matches real low-quality source tags only.
const CAM = /(camrip|hd-?cam|telesync|telecine|hd-?ts|dvdscr|screener)/i;

export function toQualityTier(resolution?: string, title?: string): QualityTier {
  const r = (resolution ?? "").toLowerCase();
  const t = (title ?? "").toLowerCase();
  if (r.includes("2160") || r === "4k" || /2160p|\b4k\b|uhd/.test(t)) return "2160p";
  if (r.includes("1080") || /1080p/.test(t)) return "1080p";
  if (r.includes("720") || /720p/.test(t)) return "720p";
  if (r.includes("480") || r.includes("576") || /480p|576p/.test(t)) return "480p";
  return "sd";
}

function normalizeSource(source?: string, title?: string): string {
  const s = (source ?? "").toLowerCase();
  const t = (title ?? "").toLowerCase();
  const hay = `${s} ${t}`;
  if (/blu-?ray|bdrip|brrip|remux/.test(hay)) return "bluray";
  if (/web-?dl|webdl/.test(hay)) return "web";
  if (/web-?rip|webrip/.test(hay)) return "webrip";
  if (/hdtv|pdtv/.test(hay)) return "hdtv";
  if (/dvd/.test(hay)) return "dvd";
  if (CAM.test(hay)) return "cam";
  return "unknown";
}

/** Parse and normalize a raw provider result into a Release. */
export function parseRelease(raw: RawRelease): Release {
  const meta = ptt.parse(raw.title) as {
    title?: string;
    year?: number;
    resolution?: string;
    codec?: string;
    source?: string;
    season?: number;
    episode?: number;
  };

  const quality = toQualityTier(meta.resolution, raw.title);
  const codec = (meta.codec ?? "").toLowerCase();
  const isHevc = HEVC.test(raw.title) || /x265|hevc|h265/.test(codec);
  const isCam = CAM.test(raw.title);

  const sizeGB =
    raw.sizeGB ??
    (raw.sizeBytes ? raw.sizeBytes / 1024 ** 3 : 0);

  const infoHash = raw.infoHash ?? extractHash(raw.magnet);

  return {
    title: raw.title,
    parsedTitle: meta.title ?? raw.title,
    parsedYear: meta.year ?? null,
    magnet: raw.magnet ?? (infoHash ? `magnet:?xt=urn:btih:${infoHash}` : ""),
    infoHash: infoHash ? infoHash.toLowerCase() : null,
    sizeGB: Number(sizeGB.toFixed(3)),
    seeders: raw.seeders ?? 0,
    leechers: raw.leechers ?? 0,
    provider: raw.provider,
    quality,
    codec: codec || (isHevc ? "x265" : ""),
    releaseSource: normalizeSource(meta.source, raw.title),
    isHevc,
    isCam,
    season: meta.season ?? null,
    episode: meta.episode ?? null,
  };
}

function extractHash(magnet?: string): string | null {
  if (!magnet) return null;
  const m = magnet.match(/btih:([a-zA-Z0-9]+)/);
  return m ? m[1] : null;
}
