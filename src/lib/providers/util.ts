export const TRACKERS = [
  "udp://open.demonii.com:1337/announce",
  "udp://tracker.openbittorrent.com:80",
  "udp://tracker.coppersurfer.tk:6969",
  "udp://glotorrents.pw:6969/announce",
  "udp://tracker.opentrackr.org:1337/announce",
  "udp://torrent.gresille.org:80/announce",
  "udp://p4p.arenabg.com:1337",
  "udp://tracker.leechers-paradise.org:6969",
  "udp://tracker.internetwarriors.net:1337/announce",
];

export function buildMagnet(infoHash: string, name: string): string {
  const trackers = TRACKERS.map((t) => `&tr=${encodeURIComponent(t)}`).join("");
  return `magnet:?xt=urn:btih:${infoHash}&dn=${encodeURIComponent(name)}${trackers}`;
}

/** Fetch JSON with a timeout; returns null on any failure. */
export async function fetchJson<T>(
  url: string,
  timeoutMs = 12000,
): Promise<T | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "Seerr2/1.0" },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export function imdbDigits(imdbId?: string | null): string | null {
  if (!imdbId) return null;
  const digits = imdbId.replace(/[^0-9]/g, "");
  return digits || null;
}

export function pad2(n: number): string {
  return String(n).padStart(2, "0");
}
