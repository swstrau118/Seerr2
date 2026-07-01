import cron from "node-cron";
import { monitorTv, pollDownloads } from "./engine";

let started = false;

/** Start background jobs once per server process. */
export function startScheduler(): void {
  if (started) return;
  started = true;

  // Poll active downloads every 30s (import completed, update progress).
  cron.schedule("*/30 * * * * *", () => {
    pollDownloads().catch((e) => console.error("[poll]", e));
  });

  // Look for newly-aired episodes of monitored shows every 15 minutes.
  cron.schedule("*/15 * * * *", () => {
    monitorTv().catch((e) => console.error("[monitor]", e));
  });

  console.log("[scheduler] background jobs started");
}
