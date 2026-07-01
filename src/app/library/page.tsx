import { prisma } from "@/lib/db";
import { LibraryGrid, type LibraryEntry } from "@/components/LibraryGrid";
import { EmptyState } from "@/components/Notice";

export const dynamic = "force-dynamic";

export default async function LibraryPage() {
  const items = await prisma.mediaItem.findMany({
    orderBy: { addedAt: "desc" },
    include: {
      downloads: {
        where: { state: { in: ["queued", "downloading", "importing"] } },
        orderBy: { updatedAt: "desc" },
        take: 1,
      },
    },
  });

  const entries: LibraryEntry[] = items.map((i) => ({
    id: i.id,
    tmdbId: i.tmdbId,
    type: i.type as "movie" | "tv",
    title: i.title,
    year: i.year,
    posterPath: i.posterPath,
    status: i.status,
    progress: i.downloads[0]?.progress ?? null,
  }));

  const movies = entries.filter((e) => e.type === "movie");
  const shows = entries.filter((e) => e.type === "tv");

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold tracking-tight">Library</h1>
      {entries.length === 0 ? (
        <EmptyState
          title="Your library is empty"
          description="Find a movie or show from Discover and download it."
        />
      ) : (
        <div className="space-y-10">
          {movies.length > 0 && (
            <section>
              <h2 className="mb-4 text-lg font-semibold">Movies</h2>
              <LibraryGrid items={movies} />
            </section>
          )}
          {shows.length > 0 && (
            <section>
              <h2 className="mb-4 text-lg font-semibold">TV Shows</h2>
              <LibraryGrid items={shows} />
            </section>
          )}
        </div>
      )}
    </div>
  );
}
