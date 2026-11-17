import { parseArgs } from "node:util";
import { PLATFORM_IDS, RELEASE_TYPES, TRACK_KINDS } from "../../src/catalogue/types.ts";
import type { CatalogueLink, ReleaseType, TrackKind } from "../../src/catalogue/types.ts";
import { KEBAB, isRealDate, linkProblem } from "../../src/catalogue/validate.ts";
import { parseStart } from "./fade.ts";
import { cleanLink } from "./links.ts";

// add-song's flags, as SPEC-media-pipeline.md's Commands table lists them.
// Everything that can be checked without the catalogue is checked here, so a
// bad flag stops the run before any audio or image work starts.
export type AddSongArgs = {
  master: string;
  start: number;
  title: string;
  kind?: TrackKind; // unset unless given, so --replace keeps a track's kind
  fadeIn?: number;
  fadeOut?: number;
  id?: string;
  release?: string;
  type?: ReleaseType;
  releaseTitle?: string;
  releaseId?: string;
  cover?: string;
  date?: string;
  crop: boolean;
  coverQuality?: number;
  lead: boolean;
  featured: boolean;
  links: CatalogueLink[]; // cleaned, checked, in the fixed platform order
  replace: boolean;
  dryRun: boolean;
};

const text = { type: "string" } as const;
const flag = { type: "boolean", default: false } as const;
const OPTIONS = {
  master: text,
  start: text,
  title: text,
  kind: text,
  "fade-in": text,
  "fade-out": text,
  id: text,
  release: text,
  type: text,
  "release-title": text,
  "release-id": text,
  cover: text,
  date: text,
  crop: flag,
  "cover-quality": text,
  lead: flag,
  featured: flag,
  replace: flag,
  "dry-run": flag,
  ...Object.fromEntries(PLATFORM_IDS.map((platform) => [platform, text])),
};

const fail = (message: string): never => {
  throw new Error(`add-song: ${message}`);
};

function oneOf<T extends string>(value: string | undefined, options: readonly T[], name: string): T | undefined {
  if (value === undefined) return undefined;
  if (!(options as readonly string[]).includes(value)) fail(`--${name} must be one of ${options.join(", ")}, not "${value}"`);
  return value as T;
}

function seconds(value: string | undefined, name: string): number | undefined {
  if (value === undefined) return undefined;
  if (!/^\d+(?:\.\d+)?$/.test(value)) fail(`--${name} must be seconds, 0 or more, like 2 or 0.5, not "${value}"`);
  return Number(value);
}

function slug(value: string | undefined, name: string): string | undefined {
  if (value !== undefined && !KEBAB.test(value)) fail(`--${name} "${value}" must be kebab-case: lower-case letters and digits joined by single hyphens`);
  return value;
}

export function parseAddSongArgs(argv: string[]): AddSongArgs {
  let values: Record<string, string | boolean | undefined>;
  try {
    ({ values } = parseArgs({ args: argv, options: OPTIONS, strict: true, allowPositionals: false }));
  } catch (error) {
    return fail((error as Error).message);
  }
  const str = (name: string) => values[name] as string | undefined;
  const bool = (name: string) => values[name] === true;

  for (const required of ["master", "start", "title"]) {
    if (!str(required)?.trim()) fail(`--${required} is required`);
  }
  let start: number;
  try {
    start = parseStart(str("start")!);
  } catch (error) {
    return fail((error as Error).message);
  }

  const date = str("date");
  if (date !== undefined && !isRealDate(date)) fail(`--date "${date}" must be a real date, written YYYY-MM-DD`);

  const quality = str("cover-quality");
  if (quality !== undefined && (!/^\d+$/.test(quality) || Number(quality) > 100)) fail(`--cover-quality must be a whole number from 0 to 100, not "${quality}"`);

  const links: CatalogueLink[] = [];
  for (const platform of PLATFORM_IDS) {
    const raw = str(platform);
    if (raw === undefined) continue;
    let url: string;
    try {
      url = cleanLink(raw);
    } catch (error) {
      return fail(`--${platform}: ${(error as Error).message}`);
    }
    const problem = linkProblem(platform, url);
    if (problem) fail(`--${platform}: ${problem}`);
    links.push({ platform, url });
  }

  const args: AddSongArgs = {
    master: str("master")!,
    start,
    title: str("title")!.trim(),
    kind: oneOf(str("kind"), TRACK_KINDS, "kind"),
    fadeIn: seconds(str("fade-in"), "fade-in"),
    fadeOut: seconds(str("fade-out"), "fade-out"),
    id: slug(str("id"), "id"),
    release: slug(str("release"), "release"),
    type: oneOf(str("type"), RELEASE_TYPES, "type"),
    releaseTitle: str("release-title")?.trim(),
    releaseId: slug(str("release-id"), "release-id"),
    cover: str("cover"),
    date,
    crop: bool("crop"),
    coverQuality: quality === undefined ? undefined : Number(quality),
    lead: bool("lead"),
    featured: bool("featured"),
    links,
    replace: bool("replace"),
    dryRun: bool("dry-run"),
  };

  // Flags that only make sense together.
  if (args.crop && !args.cover) fail("--crop needs --cover: it crops the cover being added");
  if (args.coverQuality !== undefined && !args.cover) fail("--cover-quality needs --cover: it sets the quality of the cover being added");
  if (args.release) {
    for (const [name, value] of [["type", args.type], ["release-title", args.releaseTitle], ["release-id", args.releaseId], ["date", args.date]] as const) {
      if (value !== undefined) fail(`--${name} doesn't go with --release: the release already has one`);
    }
  } else if ((args.type ?? "single") === "single") {
    if (args.releaseTitle !== undefined) fail("--release-title is for an EP or album: a single takes its track's title");
    if (args.releaseId !== undefined) fail("--release-id is for an EP or album: a single takes its track's id");
  } else if (!args.releaseTitle && !args.replace) {
    fail(`--type ${args.type} needs --release-title for the new ${args.type}`);
  }
  return args;
}
