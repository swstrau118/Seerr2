import { getSettings } from "./settings";

const TMDB_BASE = "https://api.themoviedb.org/3";
export const TMDB_IMG = "https://image.tmdb.org/t/p";

export function posterUrl(path: string | null | undefined, size = "w500") {
  return path ? `${TMDB_IMG}/${size}${path}` : null;
}
export function backdropUrl(path: string | null | undefined, size = "w1280") {
  return path ? `${TMDB_IMG}/${size}${path}` : null;
}

export type MediaType = "movie" | "tv";

export interface TmdbCard {
  id: number;
  type: MediaType;
  title: string;
  year: number | null;
  overview: string;
  posterPath: string | null;
  backdropPath: string | null;
  voteAverage: number;
}

export class TmdbNotConfiguredError extends Error {
  constructor() {
    super("TMDB API key is not configured. Add it in Settings.");
    this.name = "TmdbNotConfiguredError";
  }
}

async function tmdb<T>(
  path: string,
  params: Record<string, string | number | undefined> = {},
): Promise<T> {
  const settings = await getSettings();
  const key = settings.tmdbApiKey || process.env.TMDB_API_KEY;
  if (!key) throw new TmdbNotConfiguredError();

  const url = new URL(`${TMDB_BASE}${path}`);
  url.searchParams.set("api_key", key);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") {
      url.searchParams.set(k, String(v));
    }
  }

  const res = await fetch(url.toString(), { next: { revalidate: 3600 } });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`TMDB ${res.status}: ${body.slice(0, 200)}`);
  }
  return res.json() as Promise<T>;
}

function yearOf(dateStr?: string | null): number | null {
  if (!dateStr) return null;
  const y = Number(dateStr.slice(0, 4));
  return Number.isFinite(y) && y > 1800 ? y : null;
}

interface RawResult {
  id: number;
  media_type?: string;
  title?: string;
  name?: string;
  release_date?: string;
  first_air_date?: string;
  overview?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  vote_average?: number;
}

function toCard(r: RawResult, forced?: MediaType): TmdbCard | null {
  const type: MediaType =
    forced ?? (r.media_type === "tv" ? "tv" : r.media_type === "movie" ? "movie" : "movie");
  if (r.media_type && r.media_type !== "movie" && r.media_type !== "tv") return null;
  return {
    id: r.id,
    type,
    title: r.title ?? r.name ?? "Untitled",
    year: yearOf(r.release_date ?? r.first_air_date),
    overview: r.overview ?? "",
    posterPath: r.poster_path ?? null,
    backdropPath: r.backdrop_path ?? null,
    voteAverage: r.vote_average ?? 0,
  };
}

async function list(
  path: string,
  params: Record<string, string | number | undefined>,
  forced?: MediaType,
): Promise<TmdbCard[]> {
  const data = await tmdb<{ results: RawResult[] }>(path, params);
  return (data.results ?? [])
    .map((r) => toCard(r, forced))
    .filter((c): c is TmdbCard => c !== null && Boolean(c.posterPath));
}

export const discover = {
  trending: () => list("/trending/all/week", {}),
  popularMovies: () => list("/movie/popular", {}, "movie"),
  popularTv: () => list("/tv/popular", {}, "tv"),
  inTheaters: () => list("/movie/now_playing", { region: "US" }, "movie"),
  upcomingMovies: () => list("/movie/upcoming", { region: "US" }, "movie"),
  onTheAir: () => list("/tv/on_the_air", {}, "tv"),
  nowStreaming: () =>
    list(
      "/discover/movie",
      {
        watch_region: "US",
        with_watch_monetization_types: "flatrate",
        sort_by: "popularity.desc",
        "vote_count.gte": 50,
      },
      "movie",
    ),
};

export async function searchMulti(query: string): Promise<TmdbCard[]> {
  if (!query.trim()) return [];
  const data = await tmdb<{ results: RawResult[] }>("/search/multi", {
    query,
    include_adult: "false",
  });
  return (data.results ?? [])
    .map((r) => toCard(r))
    .filter((c): c is TmdbCard => c !== null && Boolean(c.posterPath));
}

// ---- Details ----------------------------------------------------------------

export interface WatchProvider {
  provider_name: string;
  logo_path: string | null;
}
export interface Availability {
  streaming: WatchProvider[]; // flatrate
  rent: WatchProvider[];
  buy: WatchProvider[];
  link: string | null;
}

interface RawWatchProviders {
  results?: Record<
    string,
    {
      link?: string;
      flatrate?: WatchProvider[];
      rent?: WatchProvider[];
      buy?: WatchProvider[];
    }
  >;
}

function availabilityFrom(wp: RawWatchProviders | undefined, region = "US"): Availability {
  const r = wp?.results?.[region];
  return {
    streaming: r?.flatrate ?? [],
    rent: r?.rent ?? [],
    buy: r?.buy ?? [],
    link: r?.link ?? null,
  };
}

export interface MovieDetails extends TmdbCard {
  runtime: number | null;
  genres: string[];
  tagline: string;
  availability: Availability;
  releaseStatus: "announced" | "in_theaters" | "streaming" | "released";
  digitalReleaseDate: string | null;
}

interface RawReleaseDates {
  results?: Array<{
    iso_3166_1: string;
    release_dates: Array<{ type: number; release_date: string }>;
  }>;
}

function movieReleaseStatus(
  release_date: string | undefined,
  releaseDates: RawReleaseDates | undefined,
  availability: Availability,
): { status: MovieDetails["releaseStatus"]; digital: string | null } {
  const now = Date.now();
  const us = releaseDates?.results?.find((r) => r.iso_3166_1 === "US");
  const digital = us?.release_dates.find((d) => d.type === 4 || d.type === 5);
  const theatrical = us?.release_dates.find((d) => d.type === 2 || d.type === 3);

  if (availability.streaming.length > 0) {
    return { status: "streaming", digital: digital?.release_date ?? null };
  }
  const digitalPassed = digital && new Date(digital.release_date).getTime() <= now;
  if (digitalPassed) return { status: "released", digital: digital!.release_date };

  const theatricalPassed =
    (theatrical && new Date(theatrical.release_date).getTime() <= now) ||
    (release_date && new Date(release_date).getTime() <= now);
  if (theatricalPassed) return { status: "in_theaters", digital: digital?.release_date ?? null };

  return { status: "announced", digital: digital?.release_date ?? null };
}

export async function getMovieDetails(id: number): Promise<MovieDetails> {
  const data = await tmdb<
    RawResult & {
      runtime?: number;
      genres?: { name: string }[];
      tagline?: string;
      "watch/providers"?: RawWatchProviders;
      release_dates?: RawReleaseDates;
    }
  >(`/movie/${id}`, { append_to_response: "watch/providers,release_dates" });

  const availability = availabilityFrom(data["watch/providers"]);
  const { status, digital } = movieReleaseStatus(
    data.release_date,
    data.release_dates,
    availability,
  );

  return {
    ...(toCard(data, "movie") as TmdbCard),
    runtime: data.runtime ?? null,
    genres: (data.genres ?? []).map((g) => g.name),
    tagline: data.tagline ?? "",
    availability,
    releaseStatus: status,
    digitalReleaseDate: digital,
  };
}

export interface TvEpisode {
  season: number;
  number: number;
  title: string;
  airDate: string | null;
  overview: string;
}
export interface TvSeasonSummary {
  season: number;
  name: string;
  episodeCount: number;
  airDate: string | null;
}
export interface TvDetails extends TmdbCard {
  genres: string[];
  tagline: string;
  status: string; // "Returning Series", "Ended", etc.
  seasons: TvSeasonSummary[];
  availability: Availability;
  numberOfSeasons: number;
}

export async function getTvDetails(id: number): Promise<TvDetails> {
  const data = await tmdb<
    RawResult & {
      genres?: { name: string }[];
      tagline?: string;
      status?: string;
      number_of_seasons?: number;
      seasons?: Array<{
        season_number: number;
        name: string;
        episode_count: number;
        air_date: string | null;
      }>;
      "watch/providers"?: RawWatchProviders;
    }
  >(`/tv/${id}`, { append_to_response: "watch/providers" });

  return {
    ...(toCard(data, "tv") as TmdbCard),
    genres: (data.genres ?? []).map((g) => g.name),
    tagline: data.tagline ?? "",
    status: data.status ?? "",
    numberOfSeasons: data.number_of_seasons ?? 0,
    seasons: (data.seasons ?? [])
      .filter((s) => s.season_number > 0)
      .map((s) => ({
        season: s.season_number,
        name: s.name,
        episodeCount: s.episode_count,
        airDate: s.air_date,
      })),
    availability: availabilityFrom(data["watch/providers"]),
  };
}

export async function getTvSeasonEpisodes(
  id: number,
  season: number,
): Promise<TvEpisode[]> {
  const data = await tmdb<{
    episodes?: Array<{
      season_number: number;
      episode_number: number;
      name: string;
      air_date: string | null;
      overview: string;
    }>;
  }>(`/tv/${id}/season/${season}`, {});
  return (data.episodes ?? []).map((e) => ({
    season: e.season_number,
    number: e.episode_number,
    title: e.name,
    airDate: e.air_date,
    overview: e.overview,
  }));
}

/** External IMDb id for a title (used by some torrent providers). */
export async function getImdbId(
  id: number,
  type: MediaType,
): Promise<string | null> {
  try {
    const data = await tmdb<{ imdb_id?: string; external_ids?: { imdb_id?: string } }>(
      `/${type}/${id}${type === "tv" ? "/external_ids" : ""}`,
      type === "movie" ? { append_to_response: "external_ids" } : {},
    );
    return data.imdb_id ?? data.external_ids?.imdb_id ?? null;
  } catch {
    return null;
  }
}
