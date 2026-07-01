# Seerr2

One self-hosted app that replaces the whole **Sonarr + Radarr + Overseerr** stack with a much simpler design. Browse movies and TV, click once, and Seerr2 finds the best torrent (smart seeders-vs-size logic), hands it to **your existing qBittorrent**, and files it into your **Plex/Jellyfin** library. TV shows are monitored so new episodes download themselves as they air.

- **Discover** trending / in‑theaters / now‑streaming movies and TV (via TMDB)
- **One‑click download** with a transparent auto‑picker that prefers the *smallest healthy* release and never picks dead (low/zero‑seeder) torrents
- **TV automation**: monitor shows, backfill aired episodes, auto‑grab new ones, calendar of what's coming
- **Uses your qBittorrent** over its Web API — keeps your VPN binding, speed limits, and config
- **Organizes** into clean Plex/Jellyfin folders using hardlinks (so you keep seeding)
- **Single app**, single container, SQLite — no Prowlarr/Jackett, no six services to wire together

---

## How the auto‑picker works

For every movie/episode, Seerr2 queries public torrent sources, parses each release, then:

1. **Rejects junk** — below your minimum seeders, CAM/TS, disallowed qualities, or absurd file sizes.
2. **Filters by relevance** — exact title (and year for movies) so a "The Matrix" search never grabs a sequel.
3. **Picks the best tier** — for the default *Efficient 1080p* target: `1080p → 720p → 480p`.
4. **Ranks within the tier** by a blend of **size efficiency** (smaller wins) and **swarm health** (enough seeders), with a small HEVC/x265 bonus.

Example: given a 1.7 GB and a 10 GB 1080p release with similar seeders, it picks the 1.7 GB — but if the small one has no seeders, a healthy larger one wins instead. Everything is tunable in **Settings → Quality & auto‑pick**, and you can always open **Choose release manually** to see every candidate and *why* it scored what it did.

---

## Prerequisites

- **qBittorrent** installed on the same computer (it does the actual downloading).
- A **TMDB API key** (free) for browsing/metadata.
- **Node.js 22+** and **Git** (for host install), or **Docker**.

### Windows server (Plex + qBittorrent)

If PowerShell says `git is not recognized` or `npm is not recognized`, install these first:

1. **Git for Windows** — [git-scm.com/download/win](https://git-scm.com/download/win)  
   Use the defaults. **Close and reopen PowerShell** after install so `git` is on your PATH.

2. **Node.js LTS (22+)** — [nodejs.org](https://nodejs.org)  
   Close and reopen PowerShell after install, then verify:
   ```powershell
   node --version
   npm --version
   git --version
   ```

3. **Clone and run** (PowerShell):
   ```powershell
   cd $HOME
   git clone https://github.com/swstrau118/Seerr2.git
   cd Seerr2
   Copy-Item .env.example .env
   ```
   If that says **file not found**, create `.env` manually (see [Troubleshooting](#troubleshooting) below).

   Then continue:
   ```powershell
   npm install
   npm run setup
   npm run build
   npm start
   ```
   Open **http://localhost:3000** on that PC.

4. **Settings → Folders** — use Windows paths qBittorrent and Plex already use, e.g.:
   - Download folder: `D:\Downloads`
   - Movie library: `D:\Media\Movies`
   - TV library: `D:\Media\TV`

**No Git?** Download the repo as a ZIP from [github.com/swstrau118/Seerr2](https://github.com/swstrau118/Seerr2) → **Code → Download ZIP**, extract it, then run the `npm` commands inside the folder (you still need Node.js).

---

## Setup guide

### 1. Enable qBittorrent's Web UI (one‑time)

1. Open qBittorrent → **Tools → Preferences → Web UI**.
2. Check **"Web User Interface (Remote control)"**.
3. Set a **Port** (default `8080`), a **Username**, and a strong **Password**.
4. (Optional, if Seerr2 runs on the same machine) enable **"Bypass authentication for clients on localhost"**.
5. Click **Apply**, then confirm by visiting `http://localhost:8080` and logging in.

### 2. Get a TMDB API key (one‑time)

1. Create a free account at [themoviedb.org](https://www.themoviedb.org/).
2. Go to **Settings → API** and request an **API Key (v3 auth)**.
3. Copy the key — you'll paste it into Seerr2's Settings.

### 3. Install Seerr2

> **Path consistency (important):** Seerr2's importer must be able to read the same folder qBittorrent saves to. The simplest, most reliable setup is the **host install** below, running Seerr2 on the same machine as qBittorrent so paths match exactly.

#### Option A — Host install (recommended)

```bash
git clone https://github.com/swstrau118/Seerr2.git
cd Seerr2
cp .env.example .env          # defaults are fine for a host install
npm install                   # also generates the Prisma client
npm run setup                 # creates the SQLite database
npm run build
npm start                     # serves on http://localhost:3000
```

Open **http://localhost:3000** and finish configuration in **Settings** (step 4).

To keep it running in the background, use a process manager, e.g. [pm2](https://pm2.keymetrics.io/):

```bash
npm install -g pm2
pm2 start "npm start" --name seerr2
pm2 save && pm2 startup     # start on boot
```

#### Option B — Docker

1. Edit `docker-compose.yml` and map your real folders on the left side of each volume:
   - `./data` → app database (leave as‑is)
   - your downloads folder → `/downloads`
   - your movies folder → `/media/Movies`
   - your TV folder → `/media/TV`
2. Start it:

   ```bash
   docker compose up -d --build
   ```

3. In Settings, set **qBittorrent Host** to `host.docker.internal` (already wired via `extra_hosts`), and set the folders to the container paths (`/downloads`, `/media/Movies`, `/media/TV`). Make sure qBittorrent saves to the **same** `/downloads` path (or mount it identically) so imports can find the files.

### 4. First‑run configuration (in the app)

Open **Settings** and fill in:

- **TMDB API key** — from step 2.
- **qBittorrent** — host, port, username, password, category. Click **Test connection** (should report the qBittorrent version).
- **Folders** — download folder (what qBittorrent saves to), movie library, TV library.
- **Quality & auto‑pick** — target quality, allowed qualities, minimum seeders (defaults are sensible).

Save, then head to **Discover**, open any title, and click **Download best** (movies) or **Monitor & download** (TV). Track progress on the **Activity** page and upcoming episodes on **Calendar**.

---

## How it fits together

```
Browse (TMDB) ──▶ click ──▶ search public sources ──▶ auto‑pick best
      │                                                     │
      ▼                                                     ▼
  Library/Calendar ◀── import (rename + hardlink) ◀── qBittorrent (Web API)
```

- **Metadata:** TMDB
- **Sources:** built‑in public providers (YTS, EZTV, TPB) — pluggable, and failures are isolated
- **Downloader:** your qBittorrent, via its Web API v2
- **Storage:** SQLite (via Prisma)
- **Background jobs:** in‑process scheduler polls downloads every 30s and checks monitored shows every 15 min

---

## Tech stack

Next.js (App Router) + TypeScript · Tailwind CSS · Prisma + SQLite · node‑cron

## Useful scripts

- `npm run dev` — development server
- `npm run build` / `npm start` — production build & serve
- `npm run setup` — generate Prisma client + create/upgrade the database
- `npm run smoke` — hit live providers and print what the auto‑picker would choose (dev tool)

## Troubleshooting

### `Environment variable not found: DATABASE_URL`

The app needs a `.env` file in the project folder.

**PowerShell (in `C:\Users\...\Seerr2`):**
```powershell
Copy-Item .env.example .env
npm run setup
npm start
```

Or create `.env` manually with this single line:
```
DATABASE_URL="file:./data/seerr2.db"
```

Then run `npm run setup` once to create the database, and `npm start` again.

If you already cloned the repo, pull the latest version — it includes a fallback if `.env` is missing.

## Notes & limitations

- Public torrent sources only in v1 (no private trackers). qBittorrent can still seed anything you add manually.
- Availability is updated when a download imports successfully; point Plex/Jellyfin at the same library folders.
- This is a personal, self‑hosted tool. It ships no trackers or content and takes the same posture as the \*arr stack — use it responsibly and legally.
