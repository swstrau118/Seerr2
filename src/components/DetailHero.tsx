import { backdropUrl, posterUrl, type Availability } from "@/lib/tmdb";
import { Film, Tv } from "lucide-react";

const RELEASE_LABEL: Record<string, { label: string; className: string }> = {
  announced: { label: "Announced", className: "bg-zinc-700/50 text-zinc-300" },
  in_theaters: { label: "In theaters", className: "bg-amber-500/20 text-amber-300" },
  streaming: { label: "Streaming now", className: "bg-emerald-500/20 text-emerald-300" },
  released: { label: "Released", className: "bg-emerald-500/20 text-emerald-300" },
};

export function DetailHero({
  type,
  title,
  year,
  posterPath,
  backdropPath,
  tagline,
  overview,
  genres,
  meta,
  availability,
  releaseStatus,
  children,
}: {
  type: "movie" | "tv";
  title: string;
  year: number | null;
  posterPath: string | null;
  backdropPath: string | null;
  tagline?: string;
  overview: string;
  genres: string[];
  meta: string[];
  availability?: Availability;
  releaseStatus?: string;
  children: React.ReactNode;
}) {
  const backdrop = backdropUrl(backdropPath);
  const poster = posterUrl(posterPath, "w500");
  const rl = releaseStatus ? RELEASE_LABEL[releaseStatus] : null;

  return (
    <div className="-mx-4 sm:-mx-6 -mt-6">
      <div className="relative">
        {backdrop && (
          <div className="absolute inset-0 h-[380px] overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={backdrop} alt="" className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#09090b] via-[#09090b]/80 to-[#09090b]/40" />
          </div>
        )}

        <div className="relative max-w-[1400px] mx-auto px-4 sm:px-6 pt-8 pb-6">
          <div className="flex flex-col gap-6 sm:flex-row">
            <div className="w-40 shrink-0 sm:w-52">
              <div className="aspect-[2/3] overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900">
                {poster ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={poster} alt={title} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-zinc-600">
                    {type === "tv" ? <Tv className="h-10 w-10" /> : <Film className="h-10 w-10" />}
                  </div>
                )}
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-md bg-zinc-800/80 px-2 py-0.5 text-xs font-medium text-zinc-300">
                  {type === "tv" ? <Tv className="h-3 w-3" /> : <Film className="h-3 w-3" />}
                  {type === "tv" ? "TV" : "Movie"}
                </span>
                {rl && (
                  <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${rl.className}`}>
                    {rl.label}
                  </span>
                )}
              </div>

              <h1 className="text-3xl font-bold tracking-tight">
                {title}{" "}
                {year && <span className="font-normal text-zinc-500">({year})</span>}
              </h1>
              {tagline && <p className="mt-1 text-sm italic text-zinc-500">{tagline}</p>}

              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-zinc-400">
                {meta.map((m, i) => (
                  <span key={i}>{m}</span>
                ))}
              </div>

              {genres.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {genres.map((g) => (
                    <span
                      key={g}
                      className="rounded-full border border-zinc-700 px-2.5 py-0.5 text-xs text-zinc-400"
                    >
                      {g}
                    </span>
                  ))}
                </div>
              )}

              <p className="mt-4 max-w-3xl text-sm leading-relaxed text-zinc-300">
                {overview || "No overview available."}
              </p>

              {availability && availability.streaming.length > 0 && (
                <div className="mt-4">
                  <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-zinc-500">
                    Stream on
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    {availability.streaming.map((p) => (
                      <div
                        key={p.provider_name}
                        className="flex items-center gap-1.5 rounded-lg bg-zinc-800/80 px-2 py-1 text-xs text-zinc-300"
                        title={p.provider_name}
                      >
                        {p.logo_path && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={posterUrl(p.logo_path, "w45") ?? ""}
                            alt=""
                            className="h-4 w-4 rounded"
                          />
                        )}
                        {p.provider_name}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-6">{children}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
