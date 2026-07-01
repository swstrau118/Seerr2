"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Loader2, CheckCircle2 } from "lucide-react";
import { ReleasePicker } from "./ReleasePicker";
import { StatusBadge } from "./StatusBadge";

export function MovieActions({
  tmdbId,
  title,
  year,
  status,
  progress,
}: {
  tmdbId: number;
  title: string;
  year: number | null;
  status: string | null;
  progress: number | null;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const downloadBest = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/media/movie", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tmdbId }),
      });
      const data = await res.json();
      setMessage(data.reason ?? (data.ok ? "Sent to qBittorrent." : "Failed."));
      router.refresh();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Failed.");
    } finally {
      setLoading(false);
    }
  };

  const available = status === "available";

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        {available ? (
          <span className="inline-flex items-center gap-2 rounded-lg bg-emerald-600/20 px-4 py-2.5 text-sm font-medium text-emerald-300">
            <CheckCircle2 className="h-4 w-4" /> In your library
          </span>
        ) : (
          <button
            onClick={downloadBest}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-500 disabled:opacity-60 transition"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            Download best
          </button>
        )}

        <ReleasePicker tmdbId={tmdbId} type="movie" title={title} year={year} />

        {status && <StatusBadge status={status} />}
      </div>

      {status === "downloading" && progress != null && (
        <div className="max-w-md">
          <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-800">
            <div
              className="h-full bg-brand-500 transition-all"
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-zinc-500">
            {Math.round(progress * 100)}% downloaded
          </p>
        </div>
      )}

      {message && <p className="text-sm text-zinc-400">{message}</p>}
    </div>
  );
}
