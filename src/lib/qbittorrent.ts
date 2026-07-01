import type { Setting } from "@prisma/client";

export interface QbtTorrent {
  hash: string;
  name: string;
  progress: number; // 0..1
  state: string;
  save_path: string;
  content_path: string;
  size: number;
  num_seeds: number;
  num_leechs: number;
  eta: number;
  dlspeed: number;
}

export interface QbtConnConfig {
  host: string;
  port: number;
  username: string;
  password: string;
}

const DONE_STATES = new Set([
  "uploading",
  "stalledUP",
  "pausedUP",
  "queuedUP",
  "forcedUP",
  "checkingUP",
]);
const ERROR_STATES = new Set(["error", "missingFiles"]);

export function isComplete(t: QbtTorrent): boolean {
  return t.progress >= 1 || DONE_STATES.has(t.state);
}
export function isErrored(t: QbtTorrent): boolean {
  return ERROR_STATES.has(t.state);
}

export class QbtError extends Error {}

// Cache session cookies per connection so we don't log in on every call.
const cookieCache = new Map<string, string>();

export class QbtClient {
  private base: string;
  private cfg: QbtConnConfig;
  private key: string;

  constructor(cfg: QbtConnConfig) {
    this.cfg = cfg;
    this.base = `http://${cfg.host}:${cfg.port}`;
    this.key = `${cfg.host}:${cfg.port}:${cfg.username}`;
  }

  static fromSettings(s: Setting): QbtClient {
    return new QbtClient({
      host: s.qbtHost,
      port: s.qbtPort,
      username: s.qbtUsername,
      password: s.qbtPassword,
    });
  }

  private async login(): Promise<string> {
    const body = new URLSearchParams({
      username: this.cfg.username,
      password: this.cfg.password,
    });
    const res = await fetch(`${this.base}/api/v2/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Referer: this.base,
      },
      body,
      cache: "no-store",
    }).catch((e) => {
      throw new QbtError(`Cannot reach qBittorrent at ${this.base}: ${e.message}`);
    });

    const text = await res.text();
    if (text.includes("Fails")) {
      throw new QbtError("qBittorrent rejected the username/password.");
    }
    if (!res.ok) {
      throw new QbtError(`qBittorrent login failed (HTTP ${res.status}).`);
    }

    const setCookie = res.headers.get("set-cookie");
    const sid = setCookie?.match(/SID=([^;]+)/)?.[1];
    // If auth is bypassed for localhost, there may be no cookie — that's fine.
    const cookie = sid ? `SID=${sid}` : "";
    cookieCache.set(this.key, cookie);
    return cookie;
  }

  private async request(
    path: string,
    init: RequestInit = {},
    retry = true,
  ): Promise<Response> {
    let cookie = cookieCache.get(this.key);
    if (cookie === undefined) cookie = await this.login();

    const res = await fetch(`${this.base}${path}`, {
      ...init,
      headers: {
        ...(init.headers ?? {}),
        ...(cookie ? { Cookie: cookie } : {}),
        Referer: this.base,
      },
      cache: "no-store",
    }).catch((e) => {
      throw new QbtError(`qBittorrent request failed: ${e.message}`);
    });

    if (res.status === 403 && retry) {
      cookieCache.delete(this.key);
      return this.request(path, init, false);
    }
    return res;
  }

  async version(): Promise<string> {
    const res = await this.request("/api/v2/app/version");
    if (!res.ok) throw new QbtError(`Version check failed (HTTP ${res.status}).`);
    return (await res.text()).trim();
  }

  async testConnection(): Promise<{ ok: boolean; version?: string; error?: string }> {
    try {
      cookieCache.delete(this.key);
      const version = await this.version();
      return { ok: true, version };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  }

  async ensureCategory(category: string, savePath: string): Promise<void> {
    if (!category) return;
    const body = new URLSearchParams({ category, savePath });
    // Create (ignore "already exists" errors), then make sure the path is set.
    await this.request("/api/v2/torrents/createCategory", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    await this.request("/api/v2/torrents/editCategory", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
  }

  /** Add a magnet; returns the (lowercased) infohash we expect it to appear under. */
  async addMagnet(
    magnet: string,
    opts: { category?: string; savePath?: string },
  ): Promise<void> {
    const body = new URLSearchParams({ urls: magnet });
    if (opts.category) body.set("category", opts.category);
    if (opts.savePath) body.set("savepath", opts.savePath);

    const res = await this.request("/api/v2/torrents/add", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    const text = (await res.text()).trim();
    if (!res.ok || (text && text.toLowerCase() !== "ok.")) {
      throw new QbtError(`Failed to add torrent (HTTP ${res.status}: ${text}).`);
    }
  }

  async torrents(filter?: {
    category?: string;
    hashes?: string[];
  }): Promise<QbtTorrent[]> {
    const params = new URLSearchParams();
    if (filter?.category) params.set("category", filter.category);
    if (filter?.hashes?.length) params.set("hashes", filter.hashes.join("|"));
    const res = await this.request(`/api/v2/torrents/info?${params.toString()}`);
    if (!res.ok) throw new QbtError(`Failed to list torrents (HTTP ${res.status}).`);
    return (await res.json()) as QbtTorrent[];
  }

  async getByHash(hash: string): Promise<QbtTorrent | null> {
    const list = await this.torrents({ hashes: [hash.toLowerCase()] });
    return list[0] ?? null;
  }

  async delete(hash: string, deleteFiles = false): Promise<void> {
    const body = new URLSearchParams({
      hashes: hash.toLowerCase(),
      deleteFiles: String(deleteFiles),
    });
    await this.request("/api/v2/torrents/delete", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
  }
}
