import { cn } from "@/lib/utils";

const MAP: Record<string, { label: string; className: string }> = {
  wanted: { label: "Wanted", className: "bg-zinc-700/40 text-zinc-300" },
  searching: { label: "Searching", className: "bg-blue-500/20 text-blue-300" },
  downloading: { label: "Downloading", className: "bg-brand-500/20 text-brand-300" },
  importing: { label: "Importing", className: "bg-brand-500/20 text-brand-300" },
  partial: { label: "Partial", className: "bg-amber-500/20 text-amber-300" },
  available: { label: "Available", className: "bg-emerald-500/20 text-emerald-300" },
  done: { label: "Available", className: "bg-emerald-500/20 text-emerald-300" },
  missing: { label: "Missing", className: "bg-zinc-700/40 text-zinc-400" },
  failed: { label: "Failed", className: "bg-red-500/20 text-red-300" },
  queued: { label: "Queued", className: "bg-blue-500/20 text-blue-300" },
};

export function StatusBadge({ status }: { status: string }) {
  const s = MAP[status] ?? { label: status, className: "bg-zinc-700/40 text-zinc-300" };
  return (
    <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium", s.className)}>
      {s.label}
    </span>
  );
}
