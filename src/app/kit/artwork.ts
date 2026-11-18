// The release kit's data and geometry, kept out of the .tsx so it can be
// tested. Imports media.ts and the types, never ../../catalogue/index.ts, so
// nothing here can pull the validation into the browser.
import { coverUrl } from "../../catalogue/media.ts";
import type { Catalogue, CatalogueRelease, CatalogueTrack } from "../../catalogue/types.ts";

export type KitFormat = "post" | "story";

export const FORMATS = {
  post: { width: 1080, height: 1350 },
  story: { width: 1080, height: 1920 },
} as const;

// What Instagram's own buttons and captions leave clear on a story.
export const STORY_SAFE = { top: 250, bottom: 340 };

export const COVER_SOURCE_WIDTH = 1080;

const MARGIN = 80;
const CONTENT = 920;
const LINE_HEIGHT = 1.08;
const TITLE_SIZES = { largest: 112, smallest: 32, step: 4 };

export type KitTrack = { id: string; title: string; label: string; cover: string };

function label(release: CatalogueRelease, track: CatalogueTrack): string {
  if (release.type === "ep") return "NEW EP";
  if (release.type === "album") return "NEW ALBUM";
  if (track.kind === "remix") return "NEW REMIX";
  if (track.kind === "edit") return "NEW EDIT";
  return "NEW SINGLE";
}

export function kitTracks(catalogue: Catalogue): KitTrack[] {
  return catalogue.releases.flatMap((release) =>
    release.tracks.map((track) => ({
      id: track.id,
      title: track.title,
      label: label(release, track),
      cover: coverUrl(release.cover, COVER_SOURCE_WIDTH, "webp"),
    })),
  );
}

export const fileName = (trackId: string, format: KitFormat) => `deja-gatsby-${trackId}-${format}.png`;

export const isImageFile = (file: { type: string }) => file.type.startsWith("image/");

export function centreCrop(width: number, height: number) {
  const side = Math.min(width, height);
  return { x: (width - side) / 2, y: (height - side) / 2, side };
}

type TitleBox = { width: number; height: number; maxLines: number };
type Measure = (text: string, size: number) => number;

function wrap(title: string, width: number, size: number, measure: Measure): string[] {
  const lines: string[] = [];
  for (const word of title.trim().split(/\s+/)) {
    const line = lines.at(-1);
    if (line !== undefined && measure(`${line} ${word}`, size) <= width) lines[lines.length - 1] = `${line} ${word}`;
    else lines.push(word);
  }
  return lines;
}

// The largest size at which the title fits its box, wrapped on spaces. A word
// is never broken: a long one brings the size down instead.
export function fitTitle(title: string, box: TitleBox, measure: Measure) {
  let lines: string[] = [];
  let size: number = TITLE_SIZES.largest;
  for (; size >= TITLE_SIZES.smallest; size -= TITLE_SIZES.step) {
    lines = wrap(title, box.width, size, measure);
    const fits = lines.length <= box.maxLines && lines.length * size * LINE_HEIGHT <= box.height;
    if (fits && lines.every((line) => measure(line, size) <= box.width)) return { size, lines };
  }
  return { size: TITLE_SIZES.smallest, lines };
}

export const titleLineHeight = (size: number) => size * LINE_HEIGHT;

type Box = { x: number; y: number; width: number; height: number };

export type KitLayout = { cover: Box; label: Box; title: Box; wordmark: Box; titleLines: number };

// The wordmark's box is 6.099 em wide (Wordmark/outline.ts).
const wordmarkBox = (y: number, size: number): Box => ({ x: MARGIN, y, width: size * 6.099, height: size });
const block = (y: number, height: number): Box => ({ x: MARGIN, y, width: CONTENT, height });

export function kitLayout(format: KitFormat): KitLayout {
  if (format === "post") {
    return {
      cover: block(72, CONTENT),
      label: block(1024, 48),
      title: block(1088, 170),
      wordmark: wordmarkBox(1270, 44),
      titleLines: 2,
    };
  }
  return {
    wordmark: wordmarkBox(STORY_SAFE.top, 64),
    cover: block(340, CONTENT),
    label: block(1290, 52),
    title: block(1358, FORMATS.story.height - STORY_SAFE.bottom - 1358),
    titleLines: 3,
  };
}
