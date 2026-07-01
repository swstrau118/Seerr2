"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X, Download, Loader2, Search, CheckCircle2, Ban } from "lucide-react";
import { cn, formatBytesGB } from "@/lib/utils";

interface ReleaseRow {
  title: string;
  magnet: string;
  infoHash: string | null;
  sizeGB: number;
  seeders: number;
  provider: string;
  quality: string;
  isHevc: boolean;
  score?: number;
  rejected?: boolean;
  rejectReason?: string;
}

export function ReleasePicker({
  tmdbId,
  type,
  title,
  year,
  season,
  episode,
  label = "Choose release manually",
}: {
  tmdbId: number;
  type: "movie" | "tv";
  title: string;
  year: number | null;
  season?: number;
  episode?: number;
  label?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState<string>("");
  const [chosenHash, setChosenHash] = useState<string | null>(null);
  const [releases, setReleases] = useState<ReleaseRow[]>([]);
  const [grabbing, setGrabbing] = useState<string | null>(null);

  const load = async () => {
    setOpen(true);
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/releases/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tmdbId, type, title, year, season, episode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Search failed");
      setReleases(data.releases ?? []);
      setReason(data.reason ?? "");
      setChosenHash(data.chosenInfoHash ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Search failed");
    } finally {
      setLoading(false);
    }
  };

  const grab = async (r: ReleaseRow) => {
    setGrabbing(r.magnet);
    try {
      const res = await fetch("/api/releases/grab", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tmdbId,
          type,
          title,
          year,
          season,
          episode,
          magnet: r.magnet,
          infoHash: r.infoHash,
          releaseTitle: r.title,
          quality: r.quality,
          sizeGB: r.sizeGB,
          seeders: r.seeders,
          provider: r.provider,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.reason ?? "Grab failed");
      setOpen(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Grab failed");
    } finally {
      setGrabbing(null);
    }
  };

  return (
    <>
      <button
        onClick={load}
        className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm font-medium text-zinc-200 hover:bg-zinc-800 transition"
      >
        <Search className="h-4 w-4" />
        {label}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-3xl max-h-[85vh] overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
              <div>
                <h3 className="font-semibold">Available releases</h3>
                <p className="text-xs text-zinc-500">
                  {title}
                  {season != null && episode != null
                    ? ` — S${String(season).padStart(2, "0")}E${String(episode).padStart(2, "0")}`
                    : ""}
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {reason && (
              <p className="px-5 py-2 text-xs text-brand-300 border-b border-zinc-800/60">
                {reason}
              </p>
            )}

            <div className="overflow-y-auto px-2 py-2">
              {loading && (
                <div className="flex items-center justify-center gap-2 py-16 text-zinc-400">
                  <Loader2 className="h-5 w-5 animate-spin" /> Searching torrent sources…
                </div>
              )}
              {error && (
                <p className="px-4 py-8 text-center text-sm text-red-400">{error}</p>
              )}
              {!loading && !error && releases.length === 0 && (
                <p className="px-4 py-16 text-center text-sm text-zinc-500">
                  No releases found.
                </p>
              )}

              <div className="space-y-1">
                {releases.map((r, i) => {
                  const isChosen =
                    chosenHash && r.infoHash && r.infoHash === chosenHash;
                  return (
                    <div
                      key={`${r.infoHash ?? r.title}-${i}`}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2.5",
                        r.rejected ? "opacity-45" : "hover:bg-zinc-900",
                        isChosen && "bg-brand-600/10 ring-1 ring-brand-500/40",
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-zinc-300">
                            {r.quality}
                          </span>
                          {r.isHevc && (
                            <span className="rounded bg-teal-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-teal-300">
                              HEVC
                            </span>
                          )}
                          {isChosen && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-brand-300">
                              <CheckCircle2 className="h-3 w-3" /> Recommended
                            </span>
                          )}
                        </div>
                        <p className="truncate text-sm text-zinc-200" title={r.title}>
                          {r.title}
                        </p>
                        <div className="mt-0.5 flex items-center gap-3 text-xs text-zinc-500">
                          <span>{formatBytesGB(r.sizeGB)}</span>
                          <span
                            className={cn(
                              r.seeders <= 0 ? "text-red-400" : "text-emerald-400",
                            )}
                          >
                            {r.seeders} seeders
                          </span>
                          <span>{r.provider}</span>
                          {typeof r.score === "number" && (
                            <span>score {r.score.toFixed(2)}</span>
                          )}
                          {r.rejected && (
                            <span className="inline-flex items-center gap-1 text-red-400">
                              <Ban className="h-3 w-3" /> {r.rejectReason}
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => grab(r)}
                        disabled={grabbing !== null}
                        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-500 disabled:opacity-50 transition"
                      >
                        {grabbing === r.magnet ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Download className="h-3.5 w-3.5" />
                        )}
                        Get
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
