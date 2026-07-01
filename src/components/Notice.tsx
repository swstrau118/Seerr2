import Link from "next/link";
import { AlertTriangle, Settings } from "lucide-react";

export function ConfigNotice({ message }: { message?: string }) {
  return (
    <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6 flex items-start gap-4">
      <AlertTriangle className="h-6 w-6 text-amber-400 shrink-0 mt-0.5" />
      <div>
        <h3 className="font-semibold text-amber-200">Finish setup to get started</h3>
        <p className="text-sm text-amber-100/80 mt-1 max-w-2xl">
          {message ??
            "Add your TMDB API key, connect qBittorrent, and set your library folders. Then you can browse and download in one click."}
        </p>
        <Link
          href="/settings"
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-amber-500 text-black px-4 py-2 text-sm font-medium hover:bg-amber-400 transition"
        >
          <Settings className="h-4 w-4" />
          Open Settings
        </Link>
      </div>
    </div>
  );
}

export function EmptyState({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-10 text-center">
      <h3 className="font-semibold text-zinc-200">{title}</h3>
      {description && <p className="text-sm text-zinc-500 mt-1">{description}</p>}
    </div>
  );
}
