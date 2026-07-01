"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Loader2 } from "lucide-react";
import { StatusBadge } from "./StatusBadge";

interface SeasonInfo {
  season: number;
  name: string;
  episodeCount: number;
}

export function TvActions({
  tmdbId,
  seasons,
  status,
}: {
  tmdbId: number;
  title: string;
  year: number | null;
  seasons: SeasonInfo[];
  status: string | null;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<number[]>(
    seasons.map((s) => s.season),
  );
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const toggle = (n: number) =>
    setSelected((prev) =>
      prev.includes(n) ? prev.filter((x) => x !== n) : [...prev, n],
    );

  const monitor = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/media/tv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tmdbId, seasons: selected }),
      });
      const data = await res.json();
      setMessage(data.reason ?? (data.ok ? "Monitoring started." : "Failed."));
      router.refresh();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={monitor}
          disabled={loading || selected.length === 0}
          className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-500 disabled:opacity-60 transition"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          Monitor &amp; download
        </button>
        {status && <StatusBadge status={status} />}
      </div>

      {seasons.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
            Seasons to monitor
          </p>
          <div className="flex flex-wrap gap-2">
            {seasons.map((s) => {
              const on = selected.includes(s.season);
              return (
                <button
                  key={s.season}
                  onClick={() => toggle(s.season)}
                  className={
                    "rounded-lg border px-3 py-1.5 text-xs font-medium transition " +
                    (on
                      ? "border-brand-500 bg-brand-600/20 text-brand-200"
                      : "border-zinc-700 bg-zinc-900 text-zinc-400 hover:bg-zinc-800")
                  }
                >
                  {s.name}
                  <span className="ml-1 text-zinc-500">({s.episodeCount})</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <p className="text-xs text-zinc-500">
        Newly aired episodes download automatically. Aired episodes are searched now.
      </p>

      {message && <p className="text-sm text-zinc-400">{message}</p>}
    </div>
  );
}
