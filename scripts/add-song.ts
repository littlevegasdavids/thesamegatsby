// npm run add-song -- --master <wav> --start <s> --title <text> … --dry-run
//
// Builds a snippet and, for a new release, its cover, stages them under
// .media/<key>, uploads them to R2, checks media.thesamegatsby.com serves
// each one, and only then writes songs.json. The order is fixed: check
// everything, build, stage, upload, verify, write. A failure at any step
// leaves songs.json as it was. --dry-run stops after staging.
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { COVER_FORMATS } from "../src/catalogue/types.ts";
import { parseCatalogue } from "../src/catalogue/validate.ts";
import { parseAddSongArgs } from "./media/args.ts";
import { buildCover, checkCwebp } from "./media/covers.ts";
import type { BuiltCover, CoverInput } from "./media/covers.ts";
import { lineDiff } from "./media/diff.ts";
import { COVER_WIDTHS } from "./media/keys.ts";
import { TARGET_LUFS, TRUE_PEAK_CEILING } from "./media/loudness.ts";
import { applyMerge, catalogueText, planMerge } from "./media/merge.ts";
import { buildSnippet } from "./media/snippet.ts";
import { checkHead, contentTypeFor, realMedia } from "./media/upload.ts";
import type { MediaTools } from "./media/upload.ts";
import type { BuiltSnippet, SnippetInput } from "./media/snippet.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

// The tools are passed in, so the tests can run the whole flow with fakes and
// check what happens when a step fails.
export type AddSongDeps = {
  catalogueFile: string;
  stageDir: string;
  buildSnippet: (input: SnippetInput) => Promise<BuiltSnippet>;
  buildCover: (input: CoverInput) => Promise<BuiltCover>;
  checkCwebp: () => Promise<void>;
  media: MediaTools;
  log: (line: string) => void;
};

export const realDeps = (): AddSongDeps => ({
  catalogueFile: join(ROOT, "src/catalogue/songs.json"),
  stageDir: join(ROOT, ".media"),
  buildSnippet,
  buildCover,
  checkCwebp,
  media: realMedia,
  log: (line) => console.log(line),
});

const kb = (bytes: number) => `${(bytes / 1024).toFixed(1)} KB`;
const db = (value: number) => (value === -Infinity ? "-inf" : value.toFixed(2));

async function exists(path: string) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

// Returns the exit code: 0 when the run finished, 1 when it stopped.
// songs.json is written last, once every file is confirmed live, so it's
// never half-written.
export async function runAddSong(argv: string[], deps: AddSongDeps): Promise<number> {
  const { log } = deps;
  let work: string | undefined;
  try {
    // 1. Check everything that can be checked before any slow work.
    const args = parseAddSongArgs(argv);
    const before = await readFile(deps.catalogueFile, "utf8");
    const catalogue = parseCatalogue(JSON.parse(before), { allowShortReleases: true });
    const plan = planMerge(catalogue, args);
    if (!(await exists(args.master))) throw new Error(`add-song: --master ${args.master} doesn't exist`);
    if (plan.buildCover) {
      if (!(await exists(args.cover!))) throw new Error(`add-song: --cover ${args.cover} doesn't exist`);
      await deps.checkCwebp();
    }
    if (!args.dryRun) await deps.media.whoami();

    // 2. Build.
    work = await mkdtemp(join(tmpdir(), "add-song-"));
    log(`Building ${plan.trackId}${plan.newRelease ? ` (new ${args.type ?? "single"} ${plan.releaseId})` : ` on ${plan.releaseId}`}…`);
    const snippet = await deps.buildSnippet({ master: args.master, trackId: plan.trackId, start: args.start, fadeIn: args.fadeIn, fadeOut: args.fadeOut, workDir: join(work, "snippet") });
    const cover = plan.buildCover
      ? await deps.buildCover({ source: args.cover!, releaseId: plan.releaseId, crop: args.crop, quality: args.coverQuality, workDir: join(work, "cover") })
      : undefined;

    // 3. Stage under .media/<key>, exactly as the files will sit in R2.
    const staged: [string, Uint8Array][] = [[snippet.key, snippet.bytes]];
    if (cover) for (const [slot, bytes] of cover.files) staged.push([`${cover.stem}.${slot}`, bytes]);
    for (const [key, bytes] of staged) {
      const path = join(deps.stageDir, key);
      await mkdir(dirname(path), { recursive: true });
      await writeFile(path, bytes);
    }

    // 4. Work out the catalogue change, without writing it.
    const merged = applyMerge(catalogue, args, {
      snippet: {
        key: snippet.key,
        duration: Math.round(snippet.info.duration * 1000) / 1000,
        bytes: snippet.bytes.length,
        start: args.start,
        fadeIn: snippet.fadeIn,
        fadeOut: snippet.fadeOut,
      },
      cover: cover ? { key: cover.stem, widths: [...COVER_WIDTHS], formats: [...COVER_FORMATS] } : undefined,
    });
    const after = catalogueText(merged);

    // 5. Report.
    const { loudness, info } = snippet;
    log("");
    log("Staged:");
    for (const [key, bytes] of staged) log(`  .media/${key}  ${kb(bytes.length)}`);
    log("");
    log(`Snippet: ${info.codec} ${Math.round(info.bitRate / 1000)} kbps, ${Math.round(info.duration * 1000) / 1000} s, ${info.sampleRate} Hz, audio from byte ${snippet.firstMediaByte}`);
    log(`Loudness: the cut measured ${db(loudness.loudness)} LUFS with its true peak at ${db(loudness.truePeak)} dBTP, so ${loudness.gain >= 0 ? "+" : ""}${db(loudness.gain)} dB was applied`);
    if (loudness.silent) log(`  ⚠ the cut is silent: check --start`);
    if (loudness.shortfall > 0) {
      const why = loudness.gain < 0 ? "it was turned down further to keep its peaks under" : "raising it further would push its peaks past";
      log(`  ⚠ it lands ${db(loudness.shortfall)} LU under ${TARGET_LUFS} LUFS, because ${why} ${TRUE_PEAK_CEILING} dBTP`);
    }
    if (cover) {
      log(`Cover: ${cover.source.width} × ${cover.source.height}${cover.side !== cover.source.width || cover.side !== cover.source.height ? `, cropped to ${cover.side} × ${cover.side}` : ""}`);
      if (cover.transparentPixels > 0) log(`  ⚠ ${cover.transparentPixels} transparent pixels were filled with black: check the cover by eye`);
    }
    const short = merged.releases.find((r) => r.id === plan.releaseId && r.type !== "single" && r.tracks.length < 2);
    if (short) log(`  ⚠ ${short.id} has one track: add the next with --release ${short.id} before building the site`);
    log("");
    log("songs.json would change:");
    log(lineDiff(before, after));
    log("");
    if (args.dryRun) {
      log(`Dry run: nothing uploaded, and songs.json is unchanged. Listen with: afplay .media/${snippet.key}`);
      return 0;
    }

    // 6. Upload every file, then check each one is live, then write.
    log("");
    for (const [key] of staged) {
      log(`Uploading ${key}…`);
      await deps.media.put(key, join(deps.stageDir, key), contentTypeFor(key));
    }
    const problems: string[] = [];
    for (const [key, bytes] of staged) {
      const problem = checkHead(key, await deps.media.head(key), bytes.length);
      if (problem) problems.push(problem);
    }
    if (problems.length > 0) {
      throw new Error(`add-song: uploaded, but ${problems.length} file(s) aren't served right, so songs.json is unchanged:\n  ${problems.join("\n  ")}`);
    }
    await writeFile(deps.catalogueFile, after);
    log(`Uploaded and checked ${staged.length} files on media.thesamegatsby.com, and wrote songs.json. Commit it, then push.`);
    return 0;
  } catch (error) {
    log((error as Error).message);
    return 1;
  } finally {
    if (work) await rm(work, { recursive: true, force: true });
  }
}

if (import.meta.main) {
  process.exitCode = await runAddSong(process.argv.slice(2), realDeps());
}
