import type { RawRelease, SearchQuery, TorrentProvider } from "./types";
import { buildMagnet, fetchJson } from "./util";

interface YtsTorrent {
  hash: string;
  quality: string; // 720p | 1080p | 2160p | 3D
  type: string; // bluray | web
  video_codec?: string;
  seeds: number;
  peers: number;
  size_bytes: number;
}
interface YtsMovie {
  title: string;
  title_long: string;
  year: number;
  torrents?: YtsTorrent[];
}
interface YtsResponse {
  data?: { movie_count?: number; movies?: YtsMovie[] };
}

// YTS mirrors change often; the client tries each in order.
const HOSTS = ["https://yts.mx", "https://yts.rs", "https://yts.am"];

export const ytsProvider: TorrentProvider = {
  name: "YTS",
  supports: (type) => type === "movie",
  async search(query: SearchQuery): Promise<RawRelease[]> {
    if (query.type !== "movie") return [];
    const term = query.imdbId || query.title;

    for (const host of HOSTS) {
      const url = `${host}/api/v2/list_movies.json?query_term=${encodeURIComponent(
        term,
      )}&limit=50`;
      const json = await fetchJson<YtsResponse>(url);
      const movies = json?.data?.movies;
      if (!movies || movies.length === 0) continue;

      const results: RawRelease[] = [];
      for (const movie of movies) {
        // When searching by title, keep only close year matches to avoid noise.
        if (!query.imdbId && query.year && Math.abs(movie.year - query.year) > 1) {
          continue;
        }
        for (const t of movie.torrents ?? []) {
          if (t.quality === "3D") continue;
          const name = `${movie.title} (${movie.year}) ${t.quality} ${t.type} ${
            t.video_codec ?? ""
          }`.trim();
          results.push({
            title: name,
            infoHash: t.hash,
            magnet: buildMagnet(t.hash, name),
            sizeBytes: t.size_bytes,
            seeders: t.seeds ?? 0,
            leechers: t.peers ?? 0,
            provider: "YTS",
          });
        }
      }
      if (results.length > 0) return results;
    }
    return [];
  },
};
