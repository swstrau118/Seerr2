import { getMovieDetails } from "@/lib/tmdb";
import { getSettings } from "@/lib/settings";
import { getLibraryItem } from "@/lib/library";
import { DetailHero } from "@/components/DetailHero";
import { MovieActions } from "@/components/MovieActions";
import { ConfigNotice, EmptyState } from "@/components/Notice";

export const dynamic = "force-dynamic";

export default async function MoviePage({
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
    details = await getMovieDetails(tmdbId);
  } catch (e) {
    return (
      <EmptyState
        title="Couldn't load this movie"
        description={e instanceof Error ? e.message : "TMDB request failed."}
      />
    );
  }
  const lib = await getLibraryItem(tmdbId, "movie");
  const latest = lib?.downloads[0];

  const meta: string[] = [];
  if (details.runtime) meta.push(`${details.runtime} min`);
  if (details.voteAverage) meta.push(`★ ${details.voteAverage.toFixed(1)}`);
  if (details.digitalReleaseDate) {
    meta.push(`Digital: ${new Date(details.digitalReleaseDate).toLocaleDateString()}`);
  }

  return (
    <div>
      <DetailHero
        type="movie"
        title={details.title}
        year={details.year}
        posterPath={details.posterPath}
        backdropPath={details.backdropPath}
        tagline={details.tagline}
        overview={details.overview}
        genres={details.genres}
        meta={meta}
        availability={details.availability}
        releaseStatus={details.releaseStatus}
      >
        <MovieActions
          tmdbId={tmdbId}
          title={details.title}
          year={details.year}
          status={lib?.status ?? null}
          progress={latest?.progress ?? null}
        />
      </DetailHero>
    </div>
  );
}
