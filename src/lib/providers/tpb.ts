import type { RawRelease, SearchQuery, TorrentProvider } from "./types";
import { buildMagnet, fetchJson, pad2 } from "./util";

interface TpbItem {
  name: string;
  info_hash: string;
  seeders: string;
  leechers: string;
  size: string; // bytes
}

const HOST = "https://apibay.org";

function buildTerm(query: SearchQuery): string {
  if (query.type === "movie") {
    return query.year ? `${query.title} ${query.year}` : query.title;
  }
  if (query.season != null && query.episode != null) {
    return `${query.title} S${pad2(query.season)}E${pad2(query.episode)}`;
  }
  if (query.season != null) {
    return `${query.title} S${pad2(query.season)}`;
  }
  return query.title;
}

export const tpbProvider: TorrentProvider = {
  name: "TPB",
  supports: () => true,
  async search(query: SearchQuery): Promise<RawRelease[]> {
    const term = buildTerm(query);
    // cat=200 = all video categories (includes HD movies/TV, which 201/205 exclude).
    const url = `${HOST}/q.php?q=${encodeURIComponent(term)}&cat=200`;
    const json = await fetchJson<TpbItem[]>(url);
    if (!Array.isArray(json)) return [];

    return json
      .filter(
        (i) =>
          i.info_hash &&
          !/^0{40}$/.test(i.info_hash) &&
          i.name &&
          i.name !== "No results returned",
      )
      .map((i) => ({
        title: i.name,
        infoHash: i.info_hash,
        magnet: buildMagnet(i.info_hash, i.name),
        sizeBytes: Number(i.size) || 0,
        seeders: Number(i.seeders) || 0,
        leechers: Number(i.leechers) || 0,
        provider: "TPB",
      }));
  },
};
