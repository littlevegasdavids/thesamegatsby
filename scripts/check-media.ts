// npm run check-media
//
// HEADs every snippet and cover file the catalogue names on
// media.thesamegatsby.com. It needs the network, so it isn't part of
// `npm run ci`: run it after add-song, and again at launch.
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseCatalogue } from "../src/catalogue/validate.ts";
import { checkHead, realMedia } from "./media/upload.ts";
import type { Head } from "./media/upload.ts";

export type CheckMediaDeps = { catalogueFile: string; head: (key: string) => Promise<Head>; log: (line: string) => void };

export async function runCheckMedia(deps: CheckMediaDeps): Promise<number> {
  try {
    const catalogue = parseCatalogue(JSON.parse(await readFile(deps.catalogueFile, "utf8")), { allowShortReleases: true });
    const keys: [string, number | undefined][] = [];
    for (const release of catalogue.releases) {
      for (const track of release.tracks) keys.push([track.snippet.key, track.snippet.bytes]);
      for (const width of release.cover.widths) for (const format of release.cover.formats) keys.push([`${release.cover.key}.${width}.${format}`, undefined]);
    }
    const problems: string[] = [];
    for (const [key, size] of keys) {
      const problem = checkHead(key, await deps.head(key), size);
      deps.log(problem ? `FAIL  ${problem}` : `PASS  ${key}`);
      if (problem) problems.push(problem);
    }
    deps.log(`${keys.length - problems.length} of ${keys.length} keys live with the right headers`);
    return problems.length === 0 ? 0 : 1;
  } catch (error) {
    deps.log((error as Error).message);
    return 1;
  }
}

if (import.meta.main) {
  const catalogueFile = join(dirname(fileURLToPath(import.meta.url)), "../src/catalogue/songs.json");
  process.exitCode = await runCheckMedia({ catalogueFile, head: realMedia.head, log: (line) => console.log(line) });
}
