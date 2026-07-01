import type { Release, SearchQuery } from "./providers/types";

function normalizeTitle(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\b(the|a|an)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Filter out releases that clearly belong to a different title (e.g. a
 * "Breaking Bad" search returning "The Bad Guys Breaking In"), plus wrong-year
 * movies. Kept deliberately lenient so we don't discard good matches.
 */
export function filterRelevant(
  releases: Release[],
  query: SearchQuery,
): Release[] {
  const want = normalizeTitle(query.title);
  if (!want) return releases;

  return releases.filter((r) => {
    const got = normalizeTitle(r.parsedTitle);

    if (query.type === "movie") {
      // Exact title match only, so a "The Matrix" search never grabs a sequel.
      if (got !== want) return false;
      // If both years are known, require them to line up (allow ±1).
      if (query.year && r.parsedYear) {
        return Math.abs(query.year - r.parsedYear) <= 1;
      }
      return true;
    }

    // TV: exact show match (or "Title <suffix>" like "The Office US"); if a
    // specific episode was requested, accept an exact episode match or a pack.
    const titleOk = got === want || got.startsWith(want + " ");
    if (!titleOk) return false;
    // For a specific-episode search, require an exact S/E match. Season packs
    // (episode unknown) are excluded so the importer never files the wrong file.
    if (query.episode != null) {
      if (r.episode == null) return false;
      return r.episode === query.episode && (r.season == null || r.season === query.season);
    }
    return true;
  });
}
