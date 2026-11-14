import { execFile } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";
import { COVER_FORMATS } from "../../src/catalogue/types.ts";
import { COVER_WIDTHS, coverHash, coverStem } from "./keys.ts";
import { decodePng, encodeRgbPng, flattenOntoBlack } from "./png.ts";

const run = promisify(execFile);

export const MIN_COVER = 1080; // the phone hero at 3× and release-kit's posts
export const DEFAULT_COVER_QUALITY = 50; // AVIF (SPEC-media-pipeline.md, open question 3)
// The spec only fixes AVIF's quality. cwebp's default gives Vapor_City's 1080
// at 65 KB, the size the spec measured for the fallback.
export const WEBP_QUALITY = 75;
const SRGB = "/System/Library/ColorSync/Profiles/sRGB Profile.icc";

export type CoverInput = {
  source: string; // anything sips reads: PNG, JPEG, TIFF, HEIC or SVG
  releaseId: string;
  crop?: boolean; // centre-crop a cover that isn't square
  quality?: number; // AVIF, 0–100
  workDir: string;
};

export type BuiltCover = {
  stem: string; // "covers/<releaseId>.<hash>"
  files: Map<string, Uint8Array>; // "<width>.<format>" → bytes, eight of them
  source: { width: number; height: number };
  side: number; // the square it was cut to
  transparentPixels: number; // flattened onto black, and reported so it can be checked by eye
};

// cwebp isn't part of macOS, so add-song checks for it before doing any work
// and never installs it itself.
export async function checkCwebp(): Promise<void> {
  try {
    await run("cwebp", ["-version"]);
  } catch {
    throw new Error("cwebp isn't installed, and it makes the WebP covers: brew install webp");
  }
}

export async function imageSize(file: string): Promise<{ width: number; height: number }> {
  const { stdout } = await run("sips", ["-g", "pixelWidth", "-g", "pixelHeight", file]);
  const width = /pixelWidth:\s*([\d.]+)/.exec(stdout);
  const height = /pixelHeight:\s*([\d.]+)/.exec(stdout);
  if (!width || !height) throw new Error(`sips can't read ${file} as an image`);
  return { width: Math.round(Number(width[1])), height: Math.round(Number(height[1])) };
}

// source → square check → sRGB PNG (sips) → alpha onto black (Node) → for
// each width, a resized PNG (sips) → AVIF (sips) and WebP (cwebp) → one hash
// over all eight. Every step is deterministic, so the same source and quality
// give the same bytes and the same stem.
export async function buildCover(input: CoverInput): Promise<BuiltCover> {
  const { source, releaseId, crop = false, quality = DEFAULT_COVER_QUALITY, workDir } = input;
  if (!Number.isInteger(quality) || quality < 0 || quality > 100) throw new Error(`--cover-quality must be a whole number from 0 to 100, not ${quality}`);
  await checkCwebp();

  const size = await imageSize(source);
  const side = Math.min(size.width, size.height);
  const square = size.width === size.height;
  if (!square && !crop) {
    throw new Error(`the cover is ${size.width} × ${size.height}, not square: export a square one, or pass --crop to centre-crop it to ${side} × ${side}`);
  }
  if (side < MIN_COVER) throw new Error(`the cover is ${side} px across, under the ${MIN_COVER} px minimum: export a bigger one`);

  await mkdir(workDir, { recursive: true });
  const srgb = join(workDir, `${releaseId}.srgb.png`);
  const flat = join(workDir, `${releaseId}.flat.png`);
  await run("sips", [...(square ? [] : ["-c", String(side), String(side)]), "-m", SRGB, "-s", "format", "png", source, "--out", srgb]);

  const image = decodePng(await readFile(srgb));
  if (image.width !== side || image.height !== side) {
    throw new Error(`sips gave a ${image.width} × ${image.height} image where ${side} × ${side} was expected`);
  }
  const transparentPixels = flattenOntoBlack(image);
  await writeFile(flat, encodeRgbPng(image));

  const files = new Map<string, Uint8Array>();
  for (const width of COVER_WIDTHS) {
    const resized = join(workDir, `${releaseId}.${width}.png`);
    const avif = join(workDir, `${releaseId}.${width}.avif`);
    const webp = join(workDir, `${releaseId}.${width}.webp`);
    await run("sips", ["-Z", String(width), flat, "--out", resized]);
    await run("sips", ["-s", "format", "avif", "-s", "formatOptions", String(quality), resized, "--out", avif]);
    await run("cwebp", ["-quiet", "-q", String(WEBP_QUALITY), "-metadata", "none", resized, "-o", webp]);
    for (const format of COVER_FORMATS) files.set(`${width}.${format}`, await readFile(format === "avif" ? avif : webp));
  }

  return { stem: coverStem(releaseId, coverHash(files)), files, source: size, side, transparentPixels };
}
