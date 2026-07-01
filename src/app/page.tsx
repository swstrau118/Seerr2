import { discover, type TmdbCard } from "@/lib/tmdb";
import { getSettings } from "@/lib/settings";
import { MediaRow } from "@/components/MediaRow";
import { ConfigNotice } from "@/components/Notice";

export const dynamic = "force-dynamic";

async function safe(fn: () => Promise<TmdbCard[]>): Promise<TmdbCard[]> {
  try {
    return await fn();
  } catch {
    return [];
  }
}

export default async function DiscoverPage() {
  const settings = await getSettings();
  if (!settings.tmdbApiKey && !process.env.TMDB_API_KEY) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">Discover</h1>
        <ConfigNotice message="Add your TMDB API key in Settings to start browsing movies and TV." />
      </div>
    );
  }

  const [trending, theaters, streaming, popularTv, onAir, upcoming] =
    await Promise.all([
      safe(discover.trending),
      safe(discover.inTheaters),
      safe(discover.nowStreaming),
      safe(discover.popularTv),
      safe(discover.onTheAir),
      safe(discover.upcomingMovies),
    ]);

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight mb-6">Discover</h1>
      <MediaRow title="Trending this week" cards={trending} />
      <MediaRow title="In theaters now" subtitle="Playing in cinemas" cards={theaters} />
      <MediaRow title="Now streaming" subtitle="Available to stream" cards={streaming} />
      <MediaRow title="Popular TV" cards={popularTv} />
      <MediaRow title="On the air" subtitle="Currently airing" cards={onAir} />
      <MediaRow title="Coming soon" subtitle="Upcoming releases" cards={upcoming} />
    </div>
  );
}
