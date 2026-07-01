import Link from "next/link";
import { prisma } from "@/lib/db";
import { discover, type TmdbCard } from "@/lib/tmdb";
import { getSettings } from "@/lib/settings";
import { MediaRow } from "@/components/MediaRow";
import { EmptyState } from "@/components/Notice";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

async function safeUpcoming(): Promise<TmdbCard[]> {
  try {
    return await discover.upcomingMovies();
  } catch {
    return [];
  }
}

export default async function CalendarPage() {
  const settings = await getSettings();
  const hasTmdb = Boolean(settings.tmdbApiKey || process.env.TMDB_API_KEY);

  const now = new Date();
  const horizon = new Date();
  horizon.setDate(horizon.getDate() + 60);

  const [episodes, upcomingMovies] = await Promise.all([
    prisma.episode.findMany({
      where: {
        monitored: true,
        airDate: { gte: now, lte: horizon },
        mediaItem: { type: "tv" },
      },
      orderBy: { airDate: "asc" },
      include: { mediaItem: true },
    }),
    hasTmdb ? safeUpcoming() : Promise.resolve([]),
  ]);

  // Group episodes by air date (YYYY-MM-DD).
  const groups = new Map<string, typeof episodes>();
  for (const ep of episodes) {
    const key = ep.airDate!.toISOString().slice(0, 10);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(ep);
  }
  const dates = [...groups.keys()].sort();

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold tracking-tight">Calendar</h1>

      <section className="mb-10">
        <h2 className="mb-4 text-lg font-semibold">Upcoming episodes</h2>
        {dates.length === 0 ? (
          <EmptyState
            title="No upcoming episodes"
            description="Monitor a TV show and its schedule will appear here."
          />
        ) : (
          <div className="space-y-6">
            {dates.map((date) => (
              <div key={date}>
                <h3 className="mb-2 text-sm font-semibold text-brand-300">
                  {formatDate(date)}
                </h3>
                <div className="overflow-hidden rounded-xl border border-zinc-800">
                  {groups.get(date)!.map((ep) => (
                    <Link
                      key={ep.id}
                      href={`/tv/${ep.mediaItem.tmdbId}`}
                      className="flex items-center gap-3 border-b border-zinc-800/60 px-4 py-2.5 last:border-b-0 hover:bg-zinc-900"
                    >
                      <span className="w-16 shrink-0 font-mono text-xs text-zinc-500">
                        S{String(ep.season).padStart(2, "0")}E
                        {String(ep.number).padStart(2, "0")}
                      </span>
                      <span className="truncate text-sm font-medium">
                        {ep.mediaItem.title}
                      </span>
                      <span className="truncate text-sm text-zinc-500">
                        {ep.title}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {upcomingMovies.length > 0 && (
        <MediaRow title="Upcoming movies" subtitle="Coming soon" cards={upcomingMovies} />
      )}
    </div>
  );
}
