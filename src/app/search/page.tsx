import { searchMulti } from "@/lib/tmdb";
import { MediaGrid } from "@/components/MediaRow";
import { ConfigNotice, EmptyState } from "@/components/Notice";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = (q ?? "").trim();

  const settings = await getSettings();
  if (!settings.tmdbApiKey && !process.env.TMDB_API_KEY) {
    return <ConfigNotice message="Add your TMDB API key in Settings to search." />;
  }

  if (!query) {
    return <EmptyState title="Search" description="Type a movie or show name above." />;
  }

  let results;
  try {
    results = await searchMulti(query);
  } catch (e) {
    return (
      <EmptyState
        title="Search failed"
        description={
          e instanceof Error ? e.message : "Could not reach TMDB. Check your API key."
        }
      />
    );
  }

  return (
    <div>
      <h1 className="text-xl font-semibold tracking-tight mb-6">
        Results for “{query}”
      </h1>
      <MediaGrid cards={results} />
    </div>
  );
}
