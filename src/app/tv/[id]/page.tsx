import { getTvDetails } from "@/lib/tmdb";
import { getSettings } from "@/lib/settings";
import { getLibraryItem } from "@/lib/library";
import { DetailHero } from "@/components/DetailHero";
import { TvActions } from "@/components/TvActions";
import { EpisodeList, type EpisodeRowData } from "@/components/EpisodeList";
import { ConfigNotice, EmptyState } from "@/components/Notice";

export const dynamic = "force-dynamic";

export default async function TvPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const tmdbId = Number(id);

  const settings = await getSettings();
  if (!settings.tmdbApiKey && !process.env.TMDB_API_KEY) {
    return <ConfigNotice />;
  }

  let details;
  try {
    details = await getTvDetails(tmdbId);
  } catch (e) {
    return (
      <EmptyState
        title="Couldn't load this show"
        description={e instanceof Error ? e.message : "TMDB request failed."}
      />
    );
  }
  const lib = await getLibraryItem(tmdbId, "tv");

  const meta: string[] = [];
  if (details.numberOfSeasons) meta.push(`${details.numberOfSeasons} seasons`);
  if (details.status) meta.push(details.status);
  if (details.voteAverage) meta.push(`★ ${details.voteAverage.toFixed(1)}`);

  const episodes: EpisodeRowData[] =
    lib?.episodes.map((e) => ({
      id: e.id,
      season: e.season,
      number: e.number,
      title: e.title,
      airDate: e.airDate ? e.airDate.toISOString() : null,
      state: e.state,
    })) ?? [];

  return (
    <div>
      <DetailHero
        type="tv"
        title={details.title}
        year={details.year}
        posterPath={details.posterPath}
        backdropPath={details.backdropPath}
        tagline={details.tagline}
        overview={details.overview}
        genres={details.genres}
        meta={meta}
        availability={details.availability}
      >
        <TvActions
          tmdbId={tmdbId}
          title={details.title}
          year={details.year}
          seasons={details.seasons}
          status={lib?.status ?? null}
        />
      </DetailHero>

      {episodes.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-4 text-lg font-semibold tracking-tight">Episodes</h2>
          <EpisodeList
            tmdbId={tmdbId}
            showTitle={details.title}
            year={details.year}
            episodes={episodes}
          />
        </section>
      )}
    </div>
  );
}
