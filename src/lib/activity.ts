import { prisma } from "./db";

type Level = "info" | "success" | "warn" | "error";

/** Append a line to the Activity feed (best-effort; never throws). */
export async function logActivity(message: string, level: Level = "info") {
  try {
    await prisma.activity.create({ data: { message, level } });
    // Keep the feed bounded.
    const count = await prisma.activity.count();
    if (count > 500) {
      const oldest = await prisma.activity.findMany({
        orderBy: { createdAt: "asc" },
        take: count - 500,
        select: { id: true },
      });
      await prisma.activity.deleteMany({
        where: { id: { in: oldest.map((o) => o.id) } },
      });
    }
  } catch (err) {
    console.error("[activity] failed to log:", err);
  }
}
