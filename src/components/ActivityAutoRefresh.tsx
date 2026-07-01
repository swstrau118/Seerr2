"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";

/** Polls qBittorrent + refreshes the page on an interval to show live progress. */
export function ActivityAutoRefresh() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const tick = async () => {
    setBusy(true);
    try {
      await fetch("/api/downloads/poll", { method: "POST" });
      router.refresh();
    } catch {
      /* ignore */
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    const t = setInterval(tick, 8000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <button
      onClick={tick}
      disabled={busy}
      className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-300 hover:bg-zinc-800 disabled:opacity-60"
    >
      <RefreshCw className={`h-4 w-4 ${busy ? "animate-spin" : ""}`} />
      Refresh
    </button>
  );
}
