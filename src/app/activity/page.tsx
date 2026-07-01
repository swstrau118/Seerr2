import { prisma } from "@/lib/db";
import { ActivityAutoRefresh } from "@/components/ActivityAutoRefresh";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/Notice";
import { formatBytesGB } from "@/lib/utils";

export const dynamic = "force-dynamic";

const LEVEL_COLOR: Record<string, string> = {
  info: "text-zinc-400",
  success: "text-emerald-400",
  warn: "text-amber-400",
  error: "text-red-400",
};

export default async function ActivityPage() {
  const [downloads, activities] = await Promise.all([
    prisma.download.findMany({
      orderBy: { updatedAt: "desc" },
      take: 30,
      include: { mediaItem: true, episode: true },
    }),
    prisma.activity.findMany({ orderBy: { createdAt: "desc" }, take: 100 }),
  ]);

  const active = downloads.filter((d) =>
    ["queued", "downloading", "importing"].includes(d.state),
  );

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Activity</h1>
        <ActivityAutoRefresh />
      </div>

      <section className="mb-10">
        <h2 className="mb-3 text-lg font-semibold">Downloads</h2>
        {downloads.length === 0 ? (
          <EmptyState title="No downloads yet" />
        ) : (
          <div className="overflow-hidden rounded-xl border border-zinc-800">
            {downloads.map((d) => (
              <div
                key={d.id}
                className="flex items-center gap-4 border-b border-zinc-800/60 px-4 py-3 last:border-b-0"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-zinc-200">
                    {d.mediaItem.title}
                    {d.episode
                      ? ` — S${String(d.episode.season).padStart(2, "0")}E${String(
                          d.episode.number,
                        ).padStart(2, "0")}`
                      : ""}
                  </p>
                  <p className="truncate text-xs text-zinc-500">{d.releaseTitle}</p>
                  {d.error && <p className="text-xs text-red-400">{d.error}</p>}
                  {["downloading", "importing"].includes(d.state) && (
                    <div className="mt-1.5 h-1.5 w-full max-w-sm overflow-hidden rounded-full bg-zinc-800">
                      <div
                        className="h-full bg-brand-500"
                        style={{ width: `${Math.round(d.progress * 100)}%` }}
                      />
                    </div>
                  )}
                </div>
                <div className="shrink-0 text-right">
                  <StatusBadge status={d.state} />
                  <p className="mt-1 text-xs text-zinc-500">
                    {formatBytesGB(d.sizeGB)} · {d.seeders} seeders
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">
          Recent events{" "}
          {active.length > 0 && (
            <span className="text-sm font-normal text-brand-400">
              ({active.length} active)
            </span>
          )}
        </h2>
        {activities.length === 0 ? (
          <EmptyState title="Nothing here yet" />
        ) : (
          <ul className="space-y-1.5">
            {activities.map((a) => (
              <li key={a.id} className="flex gap-3 text-sm">
                <span className="shrink-0 text-xs text-zinc-600 tabular-nums">
                  {a.createdAt.toLocaleTimeString()}
                </span>
                <span className={LEVEL_COLOR[a.level] ?? "text-zinc-400"}>
                  {a.message}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
