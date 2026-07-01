import type { TmdbCard } from "@/lib/tmdb";
import { MediaCard } from "./MediaCard";

export function MediaRow({
  title,
  subtitle,
  cards,
}: {
  title: string;
  subtitle?: string;
  cards: TmdbCard[];
}) {
  if (!cards || cards.length === 0) return null;
  return (
    <section className="mb-8">
      <div className="mb-3 flex items-baseline gap-3">
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        {subtitle && <span className="text-sm text-zinc-500">{subtitle}</span>}
      </div>
      <div className="no-scrollbar flex gap-4 overflow-x-auto pb-2">
        {cards.map((card) => (
          <div key={`${card.type}-${card.id}`} className="w-[150px] shrink-0">
            <MediaCard card={card} />
          </div>
        ))}
      </div>
    </section>
  );
}

export function MediaGrid({ cards }: { cards: TmdbCard[] }) {
  if (!cards || cards.length === 0) {
    return <p className="text-zinc-500">No results.</p>;
  }
  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-4">
      {cards.map((card) => (
        <MediaCard key={`${card.type}-${card.id}`} card={card} />
      ))}
    </div>
  );
}
