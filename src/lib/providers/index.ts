import { parseRelease } from "../parser";
import { eztvProvider } from "./eztv";
import { tpbProvider } from "./tpb";
import type { RawRelease, Release, SearchQuery, TorrentProvider } from "./types";
import { ytsProvider } from "./yts";

export const PROVIDERS: TorrentProvider[] = [
  ytsProvider,
  eztvProvider,
  tpbProvider,
];

/**
 * Query every provider that supports this media type, in parallel, and return
 * a de-duplicated, parsed list of releases. Provider failures are swallowed so
 * one broken source never breaks search.
 */
export async function searchReleases(query: SearchQuery): Promise<Release[]> {
  const active = PROVIDERS.filter((p) => p.supports(query.type));

  const settled = await Promise.allSettled(active.map((p) => p.search(query)));
  const raw: RawRelease[] = [];
  for (const s of settled) {
    if (s.status === "fulfilled") raw.push(...s.value);
  }

  const parsed = raw.map(parseRelease);

  // De-duplicate by infohash (fall back to normalized title), keeping the copy
  // with the most seeders.
  const byKey = new Map<string, Release>();
  for (const r of parsed) {
    const key = r.infoHash ?? r.title.toLowerCase().replace(/\s+/g, "");
    const existing = byKey.get(key);
    if (!existing || r.seeders > existing.seeders) byKey.set(key, r);
  }

  return [...byKey.values()];
}

export type { Release, SearchQuery } from "./types";
