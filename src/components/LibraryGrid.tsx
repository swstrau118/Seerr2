"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Trash2, Film, Tv, Loader2 } from "lucide-react";
import { StatusBadge } from "./StatusBadge";
import { posterUrl } from "@/lib/tmdb";

export interface LibraryEntry {
  id: number;
  tmdbId: number;
  type: "movie" | "tv";
  title: string;
  year: number | null;
  posterPath: string | null;
  status: string;
  progress: number | null;
}

export function LibraryGrid({ items }: { items: LibraryEntry[] }) {
  const router = useRouter();
  const [removing, setRemoving] = useState<number | null>(null);

  const remove = async (id: number) => {
    if (!confirm("Remove from library? Downloaded files are kept.")) return;
    setRemoving(id);
    try {
      await fetch(`/api/media/${id}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setRemoving(null);
    }
  };

  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
      {items.map((item) => {
        const poster = posterUrl(item.posterPath, "w342");
        return (
          <div key={item.id} className="group">
            <Link
              href={`/${item.type}/${item.tmdbId}`}
              className="relative block aspect-[2/3] overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 hover:border-brand-500/60 transition"
            >
              {poster ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={poster} alt={item.title} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-zinc-600">
                  {item.type === "tv" ? <Tv className="h-8 w-8" /> : <Film className="h-8 w-8" />}
                </div>
              )}
              {item.status === "downloading" && item.progress != null && (
                <div className="absolute inset-x-0 bottom-0 h-1.5 bg-black/50">
                  <div
                    className="h-full bg-brand-500"
                    style={{ width: `${Math.round(item.progress * 100)}%` }}
                  />
                </div>
              )}
            </Link>
            <div className="mt-2 flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{item.title}</p>
                <div className="mt-1">
                  <StatusBadge status={item.status} />
                </div>
              </div>
              <button
                onClick={() => remove(item.id)}
                disabled={removing === item.id}
                title="Remove"
                className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-red-400 transition"
              >
                {removing === item.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
