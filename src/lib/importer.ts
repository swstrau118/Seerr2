import { promises as fs } from "fs";
import path from "path";
import type { Setting } from "@prisma/client";

const VIDEO_EXT = new Set([
  ".mkv",
  ".mp4",
  ".avi",
  ".m4v",
  ".mov",
  ".ts",
  ".wmv",
  ".mpg",
  ".mpeg",
]);
const MIN_VIDEO_BYTES = 50 * 1024 * 1024; // ignore samples/extras

export interface ImportRequest {
  contentPath: string; // qBittorrent content_path (file or folder)
  type: "movie" | "tv";
  title: string;
  year: number | null;
  quality: string;
  season?: number | null;
  episode?: number | null;
}

export interface ImportResult {
  destination: string;
  method: "hardlink" | "copy";
}

export async function importDownload(
  req: ImportRequest,
  settings: Setting,
): Promise<ImportResult> {
  const source = await findMainVideoFile(req.contentPath);
  if (!source) {
    throw new Error(
      `No video file found in "${req.contentPath}". Check that the app can access qBittorrent's download folder.`,
    );
  }

  const ext = path.extname(source).toLowerCase();
  const dest =
    req.type === "movie"
      ? movieDestination(req, ext, settings)
      : tvDestination(req, ext, settings);

  const destDir = path.dirname(dest);
  await fs.mkdir(destDir, { recursive: true });

  // Remove any existing version (e.g. a quality upgrade with a different
  // filename/extension) so we don't leave duplicates in the library.
  await removeExistingVersions(req, destDir, path.basename(dest));

  const method = await linkOrCopy(source, dest, settings.useHardlinks);
  return { destination: dest, method };
}

async function removeExistingVersions(
  req: ImportRequest,
  dir: string,
  keepName: string,
): Promise<void> {
  let entries: string[];
  try {
    entries = await fs.readdir(dir);
  } catch {
    return;
  }
  const epTag =
    req.type === "tv"
      ? `S${pad2(req.season ?? 1)}E${pad2(req.episode ?? 1)}`.toLowerCase()
      : null;

  for (const name of entries) {
    if (name === keepName) continue;
    if (!VIDEO_EXT.has(path.extname(name).toLowerCase())) continue;
    // For TV, only clear files for the same episode; movie folders are per-movie.
    if (epTag && !name.toLowerCase().includes(epTag)) continue;
    await fs.unlink(path.join(dir, name)).catch(() => {});
  }
}

async function findMainVideoFile(target: string): Promise<string | null> {
  let stat;
  try {
    stat = await fs.stat(target);
  } catch {
    return null;
  }

  if (stat.isFile()) {
    return VIDEO_EXT.has(path.extname(target).toLowerCase()) ? target : null;
  }

  // Directory: gather candidate video files, then pick the largest non-sample.
  const candidates: { file: string; size: number }[] = [];
  const walk = async (dir: string) => {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
      } else if (
        VIDEO_EXT.has(path.extname(entry.name).toLowerCase()) &&
        !/sample/i.test(entry.name)
      ) {
        const st = await fs.stat(full);
        if (st.size >= MIN_VIDEO_BYTES) {
          candidates.push({ file: full, size: st.size });
        }
      }
    }
  };
  await walk(target);
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => b.size - a.size);
  return candidates[0].file;
}

function sanitize(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, "").replace(/\s+/g, " ").trim();
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function movieDestination(req: ImportRequest, ext: string, s: Setting): string {
  const yr = req.year ? ` (${req.year})` : "";
  const folder = sanitize(`${req.title}${yr}`);
  const q = req.quality ? ` [${req.quality}]` : "";
  const file = sanitize(`${req.title}${yr}${q}`) + ext;
  return path.join(s.movieLibraryDir, folder, file);
}

function tvDestination(req: ImportRequest, ext: string, s: Setting): string {
  const show = sanitize(req.title);
  const season = req.season ?? 1;
  const episode = req.episode ?? 1;
  const seasonFolder = `Season ${pad2(season)}`;
  const file =
    sanitize(`${req.title} - S${pad2(season)}E${pad2(episode)}`) + ext;
  return path.join(s.tvLibraryDir, show, seasonFolder, file);
}

async function linkOrCopy(
  source: string,
  dest: string,
  preferHardlink: boolean,
): Promise<"hardlink" | "copy"> {
  // Overwrite an existing destination (e.g. quality upgrade).
  try {
    await fs.unlink(dest);
  } catch {
    /* not present */
  }

  if (preferHardlink) {
    try {
      await fs.link(source, dest);
      return "hardlink";
    } catch (e) {
      const code = (e as NodeJS.ErrnoException).code;
      // EXDEV = cross-device; fall back to copy.
      if (code !== "EXDEV" && code !== "EPERM" && code !== "ENOTSUP") throw e;
    }
  }
  await fs.copyFile(source, dest);
  return "copy";
}
