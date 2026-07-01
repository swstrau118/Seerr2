export type QualityTier = "2160p" | "1080p" | "720p" | "480p" | "sd";

/** Raw result straight from a torrent provider before normalization. */
export interface RawRelease {
  title: string;
  magnet?: string;
  infoHash?: string;
  sizeBytes?: number;
  sizeGB?: number;
  seeders: number;
  leechers?: number;
  provider: string;
}

/** Normalized + parsed release used by the picker and UI. */
export interface Release {
  title: string;
  parsedTitle: string;
  parsedYear: number | null;
  magnet: string;
  infoHash: string | null;
  sizeGB: number;
  seeders: number;
  leechers: number;
  provider: string;
  quality: QualityTier;
  codec: string;
  releaseSource: string; // bluray | web | webrip | hdtv | cam | dvd | unknown
  isHevc: boolean;
  isCam: boolean;
  season: number | null;
  episode: number | null;
  // Scoring, filled in by the picker:
  score?: number;
  rejected?: boolean;
  rejectReason?: string;
}

export interface SearchQuery {
  title: string;
  year?: number | null;
  imdbId?: string | null;
  type: "movie" | "tv";
  season?: number;
  episode?: number;
}

export interface TorrentProvider {
  name: string;
  supports: (type: "movie" | "tv") => boolean;
  search: (query: SearchQuery) => Promise<RawRelease[]>;
}
