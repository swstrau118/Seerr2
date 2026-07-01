/* Manual smoke test: hits live torrent providers and runs the picker.
 * Run with: npx tsx scripts/smoke.ts
 * Not part of the app; safe to delete.
 */
import { searchReleases } from "../src/lib/providers";
import { pickBest } from "../src/lib/picker";
import { parseRelease } from "../src/lib/parser";
import { filterRelevant } from "../src/lib/relevance";

const fakeSettings = {
  id: 1,
  minSeeders: 5,
  qualityTarget: "efficient1080",
  allowedTiers: "1080p,720p",
  idealMovieSize1080: 3,
  idealMovieSize720: 1.5,
  idealMovieSize2160: 20,
  idealEpisodeSize: 1.2,
  sizeWeight: 0.55,
  healthWeight: 0.45,
  hevcBonus: 0.15,
} as never;

function testPickerExample() {
  console.log("\n=== Picker unit check (1.7GB vs 10GB, similar seeders) ===");
  const releases = [
    parseRelease({ title: "The Matrix (1999) 1080p BluRay x265", sizeGB: 1.7, seeders: 40, provider: "T" }),
    parseRelease({ title: "The Matrix (1999) 1080p BluRay x264", sizeGB: 10, seeders: 45, provider: "T" }),
    parseRelease({ title: "The Matrix (1999) 1080p WEB x264", sizeGB: 2.0, seeders: 0, provider: "T" }),
  ];
  const { chosen, reason } = pickBest(releases, fakeSettings, { type: "movie", isEpisode: false });
  console.log("reason:", reason);
  console.log("chosen size:", chosen?.sizeGB, "GB seeders:", chosen?.seeders);
  console.assert(chosen?.sizeGB === 1.7, "Expected the 1.7GB release to win");
  console.log(chosen?.sizeGB === 1.7 ? "PASS ✅" : "FAIL ❌");
}

async function testLiveMovie() {
  console.log("\n=== Live provider check: movie (The Matrix, imdb tt0133093) ===");
  const q = { title: "The Matrix", year: 1999, imdbId: "tt0133093", type: "movie" as const };
  const releases = filterRelevant(await searchReleases(q), q);
  console.log("providers returned", releases.length, "relevant releases");
  for (const r of releases.slice(0, 8)) {
    console.log(`  [${r.provider}] ${r.quality} ${r.sizeGB.toFixed(2)}GB seeds=${r.seeders} ${r.isHevc ? "HEVC" : ""}`);
  }
  const { chosen, reason } = pickBest(releases, fakeSettings, { type: "movie", isEpisode: false });
  console.log("PICK:", reason);
}

async function testLiveTv() {
  console.log("\n=== Live provider check: TV (Breaking Bad S01E01, imdb tt0903747) ===");
  const q = {
    title: "Breaking Bad",
    imdbId: "tt0903747",
    type: "tv" as const,
    season: 1,
    episode: 1,
  };
  const releases = filterRelevant(await searchReleases(q), q);
  console.log("providers returned", releases.length, "relevant releases");
  for (const r of releases.slice(0, 8)) {
    console.log(`  [${r.provider}] ${r.quality} ${r.sizeGB.toFixed(2)}GB seeds=${r.seeders} "${r.parsedTitle}"`);
  }
  const { chosen, reason } = pickBest(releases, fakeSettings, { type: "tv", isEpisode: true });
  console.log("PICK:", reason, chosen ? `"${chosen.title}"` : "");
}

(async () => {
  testPickerExample();
  await testLiveMovie().catch((e) => console.error("movie test error:", e.message));
  await testLiveTv().catch((e) => console.error("tv test error:", e.message));
})();
