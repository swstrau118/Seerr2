import Link from "next/link";
import { Star, Film, Tv } from "lucide-react";
import type { TmdbCard } from "@/lib/tmdb";
import { posterUrl } from "@/lib/tmdb";

export function MediaCard({ card }: { card: TmdbCard }) {
  const href = `/${card.type}/${card.id}`;
  const poster = posterUrl(card.posterPath, "w342");

  return (
    <Link
      href={href}
      className="group block w-full shrink-0"
    >
      <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-zinc-900 border border-zinc-800 group-hover:border-brand-500/60 transition">
        {poster ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={poster}
            alt={card.title}
            loading="lazy"
            className="h-full w-full object-cover group-hover:scale-105 transition duration-300"
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-zinc-600">
            {card.type === "tv" ? <Tv className="h-8 w-8" /> : <Film className="h-8 w-8" />}
          </div>
        )}
        <div className="absolute top-2 right-2 flex items-center gap-1 rounded-md bg-black/70 px-1.5 py-0.5 text-xs font-medium">
          <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
          {card.voteAverage.toFixed(1)}
        </div>
        <div className="absolute top-2 left-2 rounded-md bg-black/70 p-1 text-zinc-300">
          {card.type === "tv" ? <Tv className="h-3.5 w-3.5" /> : <Film className="h-3.5 w-3.5" />}
        </div>
      </div>
      <div className="mt-2 px-0.5">
        <p className="text-sm font-medium truncate group-hover:text-brand-300 transition">
          {card.title}
        </p>
        <p className="text-xs text-zinc-500">{card.year ?? "—"}</p>
      </div>
    </Link>
  );
}
