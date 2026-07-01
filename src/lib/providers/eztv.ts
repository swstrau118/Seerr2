import type { RawRelease, SearchQuery, TorrentProvider } from "./types";
import { fetchJson, imdbDigits } from "./util";

interface EztvTorrent {
  title: string;
  magnet_url: string;
  hash: string;
  seeds: number;
  peers: number;
  size_bytes: string | number;
  season: string;
  episode: string;
}
interface EztvResponse {
  torrents?: EztvTorrent[];
}

const HOSTS = ["https://eztvx.to", "https://eztv.re", "https://eztv.wf"];

export const eztvProvider: TorrentProvider = {
  name: "EZTV",
  supports: (type) => type === "tv",
  async search(query: SearchQuery): Promise<RawRelease[]> {
    if (query.type !== "tv") return [];
    const imdb = imdbDigits(query.imdbId);
    if (!imdb) return []; // EZTV only supports IMDb-id lookups reliably.

    for (const host of HOSTS) {
      const url = `${host}/api/get-torrents?imdb_id=${imdb}&limit=100`;
      const json = await fetchJson<EztvResponse>(url);
      const torrents = json?.torrents;
      if (!torrents || torrents.length === 0) continue;

      const results: RawRelease[] = torrents
        .filter((t) => {
          if (query.season == null) return true;
          const s = Number(t.season);
          if (s !== query.season) return false;
          if (query.episode == null) return true;
          return Number(t.episode) === query.episode;
        })
        .map((t) => ({
          title: t.title,
          magnet: t.magnet_url,
          infoHash: t.hash,
          sizeBytes: Number(t.size_bytes) || 0,
          seeders: t.seeds ?? 0,
          leechers: t.peers ?? 0,
          provider: "EZTV",
        }));
      if (results.length > 0) return results;
    }
    return [];
  },
};
