import { SettingsForm } from "@/components/SettingsForm";

export const dynamic = "force-dynamic";

export default function SettingsPage() {
  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold tracking-tight">Settings</h1>
      <p className="mb-6 text-sm text-zinc-500">
        Connect TMDB and qBittorrent, set your library folders, and tune the
        auto-pick algorithm.
      </p>
      <SettingsForm />
    </div>
  );
}
