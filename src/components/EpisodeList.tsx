"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Loader2 } from "lucide-react";
import { StatusBadge } from "./StatusBadge";
import { ReleasePicker } from "./ReleasePicker";
import { formatDate } from "@/lib/utils";

export interface EpisodeRowData {
  id: number;
  season: number;
  number: number;
  title: string;
  airDate: string | null;
  state: string;
}

export function EpisodeList({
  tmdbId,
  showTitle,
  year,
  episodes,
}: {
  tmdbId: number;
  showTitle: string;
  year: number | null;
  episodes: EpisodeRowData[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<number | null>(null);

  const autoGrab = async (id: number) => {
    setBusy(id);
    try {
      await fetch(`/api/episodes/${id}/grab`, { method: "POST" });
      router.refresh();
    } finally {
      setBusy(null);
    }
  };

  const bySeason = new Map<number, EpisodeRowData[]>();
  for (const ep of episodes) {
    if (!bySeason.has(ep.season)) bySeason.set(ep.season, []);
    bySeason.get(ep.season)!.push(ep);
  }
  const seasons = [...bySeason.keys()].sort((a, b) => a - b);

  return (
    <div className="space-y-6">
      {seasons.map((season) => (
        <div key={season}>
          <h3 className="mb-2 text-sm font-semibold text-zinc-300">
            Season {season}
          </h3>
          <div className="overflow-hidden rounded-xl border border-zinc-800">
            {bySeason.get(season)!.map((ep) => {
              const aired = ep.airDate ? new Date(ep.airDate) <= new Date() : false;
              return (
                <div
                  key={ep.id}
                  className="flex items-center gap-3 border-b border-zinc-800/60 px-4 py-2.5 last:border-b-0"
                >
                  <span className="w-12 shrink-0 text-xs font-mono text-zinc-500">
                    S{String(ep.season).padStart(2, "0")}E
                    {String(ep.number).padStart(2, "0")}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-zinc-200">{ep.title || "TBA"}</p>
                    <p className="text-xs text-zinc-500">{formatDate(ep.airDate)}</p>
                  </div>
                  <StatusBadge status={ep.state} />
                  {ep.state !== "available" && ep.state !== "downloading" && aired && (
                    <>
                      <button
                        onClick={() => autoGrab(ep.id)}
                        disabled={busy !== null}
                        className="inline-flex items-center gap-1 rounded-md bg-brand-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-brand-500 disabled:opacity-50"
                      >
                        {busy === ep.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Download className="h-3 w-3" />
                        )}
                        Auto
                      </button>
                      <ReleasePicker
                        tmdbId={tmdbId}
                        type="tv"
                        title={showTitle}
                        year={year}
                        season={ep.season}
                        episode={ep.number}
                        label="Pick"
                      />
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
