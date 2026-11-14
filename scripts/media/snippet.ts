import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { DEFAULT_FADE_IN, DEFAULT_FADE_OUT, applyFades, cut } from "./fade.ts";
import { KEPT_RATES, audioInfo, decodeToFloatWav, encodeAac } from "./encode.ts";
import type { AudioInfo } from "./encode.ts";
import { snippetKey } from "./keys.ts";
import { applyGain, matchLoudness } from "./loudness.ts";
import type { LoudnessMatch } from "./loudness.ts";
import { checkFastStart, zeroTimestamps } from "./mp4.ts";
import { readWav, writeWav } from "./wav.ts";

export type SnippetInput = {
  master: string; // a path outside the repo
  trackId: string;
  start: number; // seconds
  fadeIn?: number;
  fadeOut?: number;
  workDir: string; // scratch space for the intermediate files
};

export type BuiltSnippet = {
  key: string;
  bytes: Uint8Array; // the staged .m4a, timestamps zeroed
  info: AudioInfo; // afinfo's view of it
  loudness: LoudnessMatch; // the cut as measured, and the gain applied
  firstMediaByte: number;
  fadeIn: number;
  fadeOut: number;
};

// master → float WAV → cut 30 s → match loudness → fades → AAC → zero the
// times → hash. The gain goes on before the fades, so the meter hears the
// cut as it plays, not its faded ends. Every step is deterministic, so the
// same master and settings give the same bytes and the same key.
export async function buildSnippet(input: SnippetInput): Promise<BuiltSnippet> {
  const { master, trackId, start, workDir, fadeIn = DEFAULT_FADE_IN, fadeOut = DEFAULT_FADE_OUT } = input;
  await mkdir(workDir, { recursive: true });
  const decoded = join(workDir, `${trackId}.master.wav`);
  const prepared = join(workDir, `${trackId}.snippet.wav`);
  const encoded = join(workDir, `${trackId}.m4a`);

  await decodeToFloatWav(master, decoded);
  let full = readWav(await readFile(decoded));
  if (!KEPT_RATES.includes(full.sampleRate)) {
    await decodeToFloatWav(master, decoded, 48_000);
    full = readWav(await readFile(decoded));
  }

  const snippet = cut(full, start);
  const loudness = matchLoudness(snippet);
  const shaped = applyFades(applyGain(snippet, loudness.gain), { fadeIn, fadeOut });
  await writeFile(prepared, writeWav(shaped));
  await encodeAac(prepared, encoded);

  const bytes = zeroTimestamps(await readFile(encoded));
  const { firstMediaByte } = checkFastStart(bytes);
  await writeFile(encoded, bytes);
  const info = await audioInfo(encoded);
  return { key: snippetKey(trackId, bytes), bytes, info, loudness, firstMediaByte, fadeIn, fadeOut };
}
