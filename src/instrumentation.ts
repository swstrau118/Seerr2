export async function register() {
  // Only run background jobs in the Node.js server runtime (not Edge/build).
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startScheduler } = await import("./lib/scheduler");
    startScheduler();
  }
}
