import { createHash } from "node:crypto";
import { COVER_FORMATS } from "../../src/catalogue/types.ts";

export const COVER_WIDTHS = [192, 384, 768, 1080] as const;

// The fixed order a cover's files are hashed in, smallest first, AVIF before
// WebP within a width.
const COVER_SLOTS = COVER_WIDTHS.flatMap((width) => COVER_FORMATS.map((format) => `${width}.${format}`));

export const shortHash = (data: Uint8Array) => createHash("sha256").update(data).digest("hex").slice(0, 8);

export const snippetKey = (trackId: string, m4a: Uint8Array) => `snippets/${trackId}.${shortHash(m4a)}.m4a`;

export const coverStem = (releaseId: string, hash: string) => `covers/${releaseId}.${hash}`;

// One hash over all eight files, keyed "<width>.<format>", so every size and
// format of a cover shares it. Each file goes in with its slot and length, so
// bytes can't move from one file to the next and give the same hash.
export function coverHash(files: ReadonlyMap<string, Uint8Array>): string {
  const extra = [...files.keys()].filter((slot) => !COVER_SLOTS.includes(slot));
  if (extra.length > 0) throw new Error(`unexpected cover files: ${extra.join(", ")}`);
  const hash = createHash("sha256");
  for (const slot of COVER_SLOTS) {
    const file = files.get(slot);
    if (!file) throw new Error(`the cover is missing ${slot}`);
    hash.update(`${slot}:${file.length}:`).update(file);
  }
  return hash.digest("hex").slice(0, 8);
}
