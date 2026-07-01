"use client";

import { useEffect, useState } from "react";
import {
  Loader2,
  Save,
  Plug,
  CheckCircle2,
  XCircle,
  ChevronDown,
} from "lucide-react";

interface SettingsState {
  tmdbApiKey: string;
  qbtHost: string;
  qbtPort: number;
  qbtUsername: string;
  qbtCategory: string;
  downloadDir: string;
  movieLibraryDir: string;
  tvLibraryDir: string;
  useHardlinks: boolean;
  minSeeders: number;
  qualityTarget: string;
  allowedTiers: string;
  idealMovieSize1080: number;
  idealMovieSize720: number;
  idealMovieSize2160: number;
  idealEpisodeSize: number;
  sizeWeight: number;
  healthWeight: number;
  hevcBonus: number;
  hasPassword?: boolean;
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-zinc-300">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-zinc-500">{hint}</span>}
    </label>
  );
}

const inputClass =
  "w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500";

export function SettingsForm() {
  const [s, setS] = useState<SettingsState | null>(null);
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then(setS)
      .catch(() => setS(null));
  }, []);

  if (!s) {
    return (
      <div className="flex items-center gap-2 py-10 text-zinc-400">
        <Loader2 className="h-5 w-5 animate-spin" /> Loading settings…
      </div>
    );
  }

  const set = <K extends keyof SettingsState>(k: K, v: SettingsState[K]) =>
    setS((prev) => (prev ? { ...prev, [k]: v } : prev));

  const save = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const payload: Record<string, unknown> = { ...s };
      if (password) payload.qbtPassword = password;
      delete payload.hasPassword;
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      setS(data);
      setPassword("");
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  };

  const test = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/qbt/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          qbtHost: s.qbtHost,
          qbtPort: s.qbtPort,
          qbtUsername: s.qbtUsername,
          qbtPassword: password || undefined,
        }),
      });
      const data = await res.json();
      setTestResult({
        ok: data.ok,
        msg: data.ok ? `Connected to qBittorrent v${data.version}` : data.error,
      });
    } catch (e) {
      setTestResult({ ok: false, msg: e instanceof Error ? e.message : "Failed" });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-8">
      <section className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
        <h2 className="text-lg font-semibold">Metadata</h2>
        <Field
          label="TMDB API key"
          hint="Free key from themoviedb.org → Settings → API. Required for browsing."
        >
          <input
            className={inputClass}
            value={s.tmdbApiKey}
            onChange={(e) => set("tmdbApiKey", e.target.value)}
            placeholder="Your TMDB API key"
          />
        </Field>
      </section>

      <section className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
        <h2 className="text-lg font-semibold">qBittorrent</h2>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Host">
            <input
              className={inputClass}
              value={s.qbtHost}
              onChange={(e) => set("qbtHost", e.target.value)}
              placeholder="localhost"
            />
          </Field>
          <Field label="Port">
            <input
              type="number"
              className={inputClass}
              value={s.qbtPort}
              onChange={(e) => set("qbtPort", Number(e.target.value))}
              placeholder="8080"
            />
          </Field>
          <Field label="Username">
            <input
              className={inputClass}
              value={s.qbtUsername}
              onChange={(e) => set("qbtUsername", e.target.value)}
            />
          </Field>
          <Field
            label="Password"
            hint={s.hasPassword ? "Leave blank to keep current" : undefined}
          >
            <input
              type="password"
              className={inputClass}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={s.hasPassword ? "••••••••" : ""}
            />
          </Field>
        </div>
        <Field label="Category" hint="Torrents added by Seerr2 get this label in qBittorrent.">
          <input
            className={inputClass}
            value={s.qbtCategory}
            onChange={(e) => set("qbtCategory", e.target.value)}
          />
        </Field>
        <div className="flex items-center gap-3">
          <button
            onClick={test}
            disabled={testing}
            className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm font-medium hover:bg-zinc-800 disabled:opacity-60"
          >
            {testing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plug className="h-4 w-4" />
            )}
            Test connection
          </button>
          {testResult && (
            <span
              className={`inline-flex items-center gap-1.5 text-sm ${
                testResult.ok ? "text-emerald-400" : "text-red-400"
              }`}
            >
              {testResult.ok ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}
              {testResult.msg}
            </span>
          )}
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
        <h2 className="text-lg font-semibold">Folders</h2>
        <Field
          label="Download folder"
          hint="Where qBittorrent saves downloads. The app must be able to read this path."
        >
          <input
            className={inputClass}
            value={s.downloadDir}
            onChange={(e) => set("downloadDir", e.target.value)}
            placeholder="/downloads"
          />
        </Field>
        <Field label="Movie library folder" hint="Plex/Jellyfin movies root.">
          <input
            className={inputClass}
            value={s.movieLibraryDir}
            onChange={(e) => set("movieLibraryDir", e.target.value)}
            placeholder="/media/Movies"
          />
        </Field>
        <Field label="TV library folder" hint="Plex/Jellyfin TV root.">
          <input
            className={inputClass}
            value={s.tvLibraryDir}
            onChange={(e) => set("tvLibraryDir", e.target.value)}
            placeholder="/media/TV"
          />
        </Field>
        <label className="flex items-center gap-2 text-sm text-zinc-300">
          <input
            type="checkbox"
            checked={s.useHardlinks}
            onChange={(e) => set("useHardlinks", e.target.checked)}
            className="h-4 w-4 rounded border-zinc-600 bg-zinc-900"
          />
          Use hardlinks (keeps seeding, saves space; falls back to copy across drives)
        </label>
      </section>

      <section className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
        <h2 className="text-lg font-semibold">Quality &amp; auto-pick</h2>
        <Field label="Quality target">
          <select
            className={inputClass}
            value={s.qualityTarget}
            onChange={(e) => set("qualityTarget", e.target.value)}
          >
            <option value="efficient1080">Efficient 1080p (smallest healthy)</option>
            <option value="balanced">Balanced (best seeders-per-GB)</option>
            <option value="max4k">Max quality (prefer 4K)</option>
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Allowed qualities" hint="Comma-separated, e.g. 1080p,720p">
            <input
              className={inputClass}
              value={s.allowedTiers}
              onChange={(e) => set("allowedTiers", e.target.value)}
            />
          </Field>
          <Field label="Minimum seeders" hint="Releases below this are rejected.">
            <input
              type="number"
              className={inputClass}
              value={s.minSeeders}
              onChange={(e) => set("minSeeders", Number(e.target.value))}
            />
          </Field>
        </div>

        <button
          onClick={() => setShowAdvanced((v) => !v)}
          className="inline-flex items-center gap-1 text-sm text-zinc-400 hover:text-zinc-200"
        >
          <ChevronDown
            className={`h-4 w-4 transition ${showAdvanced ? "rotate-180" : ""}`}
          />
          Advanced tuning
        </button>

        {showAdvanced && (
          <div className="grid grid-cols-2 gap-4 border-t border-zinc-800 pt-4">
            <Field label="Ideal 1080p movie (GB)">
              <input
                type="number"
                step="0.1"
                className={inputClass}
                value={s.idealMovieSize1080}
                onChange={(e) => set("idealMovieSize1080", Number(e.target.value))}
              />
            </Field>
            <Field label="Ideal 720p movie (GB)">
              <input
                type="number"
                step="0.1"
                className={inputClass}
                value={s.idealMovieSize720}
                onChange={(e) => set("idealMovieSize720", Number(e.target.value))}
              />
            </Field>
            <Field label="Ideal 2160p movie (GB)">
              <input
                type="number"
                step="0.1"
                className={inputClass}
                value={s.idealMovieSize2160}
                onChange={(e) => set("idealMovieSize2160", Number(e.target.value))}
              />
            </Field>
            <Field label="Ideal episode (GB)">
              <input
                type="number"
                step="0.1"
                className={inputClass}
                value={s.idealEpisodeSize}
                onChange={(e) => set("idealEpisodeSize", Number(e.target.value))}
              />
            </Field>
            <Field label="Size weight" hint="Higher = prefer smaller files more.">
              <input
                type="number"
                step="0.05"
                className={inputClass}
                value={s.sizeWeight}
                onChange={(e) => set("sizeWeight", Number(e.target.value))}
              />
            </Field>
            <Field label="Health weight" hint="Higher = prefer more seeders more.">
              <input
                type="number"
                step="0.05"
                className={inputClass}
                value={s.healthWeight}
                onChange={(e) => set("healthWeight", Number(e.target.value))}
              />
            </Field>
            <Field label="HEVC bonus" hint="Score boost for x265/HEVC.">
              <input
                type="number"
                step="0.05"
                className={inputClass}
                value={s.hevcBonus}
                onChange={(e) => set("hevcBonus", Number(e.target.value))}
              />
            </Field>
          </div>
        )}
      </section>

      <div className="flex items-center gap-3">
        <button
          onClick={save}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-500 disabled:opacity-60"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save settings
        </button>
        {saved && (
          <span className="inline-flex items-center gap-1.5 text-sm text-emerald-400">
            <CheckCircle2 className="h-4 w-4" /> Saved
          </span>
        )}
      </div>
    </div>
  );
}
