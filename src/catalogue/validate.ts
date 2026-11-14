import { COVER_FORMATS, PLATFORM_IDS, RELEASE_TYPES, TRACK_KINDS } from "./types.ts";
import type { Catalogue, PlatformId } from "./types.ts";

// Checks songs.json against SPEC-media-pipeline.md's Validation rules. It
// throws on the first problem, naming the field, so a bad hand edit fails
// `next build` and the tests with a message saying what to fix.

export const KEBAB = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const HASH = "[0-9a-f]{8}";
export const SNIPPET_LENGTH = 30;
const SNIPPET_TOLERANCE = 0.05;

// Each platform's hosts. Bandcamp is any artist's subdomain, and Amazon Music
// any of its country domains, such as music.amazon.co.uk.
const HOSTS: Record<PlatformId, (host: string) => boolean> = {
  spotify: (h) => h === "open.spotify.com",
  "apple-music": (h) => h === "music.apple.com",
  "youtube-music": (h) => h === "music.youtube.com" || h === "www.youtube.com",
  soundcloud: (h) => h === "soundcloud.com",
  bandcamp: (h) => /^[a-z0-9-]+\.bandcamp\.com$/.test(h),
  "amazon-music": (h) => /^music\.amazon\.[a-z]{2,3}(?:\.[a-z]{2})?$/.test(h),
  deezer: (h) => h === "www.deezer.com" || h === "link.deezer.com",
  tidal: (h) => h === "tidal.com" || h === "listen.tidal.com",
};

const isTracking = (param: string) => param === "si" || param.startsWith("utm_");

class CatalogueError extends Error {
  constructor(path: string, problem: string) {
    super(`songs.json ${path}: ${problem}`);
    this.name = "CatalogueError";
  }
}

type Obj = Record<string, unknown>;

function object(value: unknown, path: string, fields: { required: string[]; optional?: string[] }): Obj {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new CatalogueError(path, "must be an object");
  }
  const obj = value as Obj;
  const allowed = new Set([...fields.required, ...(fields.optional ?? [])]);
  for (const key of Object.keys(obj)) {
    if (!allowed.has(key)) throw new CatalogueError(`${path}.${key}`, "isn't a catalogue field");
  }
  for (const key of fields.required) {
    if (!(key in obj)) throw new CatalogueError(`${path}.${key}`, "is missing");
  }
  return obj;
}

function array(value: unknown, path: string): unknown[] {
  if (!Array.isArray(value)) throw new CatalogueError(path, "must be a list");
  return value;
}

function text(value: unknown, path: string): string {
  if (typeof value !== "string" || value.trim() === "") throw new CatalogueError(path, "must be non-empty text");
  return value;
}

function id(value: unknown, path: string): string {
  const s = text(value, path);
  if (!KEBAB.test(s)) throw new CatalogueError(path, `"${s}" must be kebab-case: lower-case letters and digits joined by single hyphens`);
  return s;
}

function oneOf<T extends string>(value: unknown, options: readonly T[], path: string): T {
  if (typeof value !== "string" || !(options as readonly string[]).includes(value)) {
    throw new CatalogueError(path, `must be one of ${options.join(", ")}`);
  }
  return value as T;
}

function number(value: unknown, path: string, { min, integer = false, above = false }: { min: number; integer?: boolean; above?: boolean }) {
  const ok =
    typeof value === "number" &&
    Number.isFinite(value) &&
    (above ? value > min : value >= min) &&
    (!integer || Number.isInteger(value));
  if (!ok) throw new CatalogueError(path, `must be ${integer ? "a whole number" : "a number"} ${above ? "above" : "of at least"} ${min}`);
  return value as number;
}

// A real calendar day in YYYY-MM-DD, so 2023-02-29 and 2024-13-01 are refused.
// Exported so add-song checks --date with the same rule.
export function isRealDate(s: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  const day = match && new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return !!day && day.toISOString().slice(0, 10) === s;
}

function isoDate(value: unknown, path: string): string {
  const s = text(value, path);
  if (!isRealDate(s)) throw new CatalogueError(path, `"${s}" must be a real date, written YYYY-MM-DD`);
  return s;
}

// What's wrong with a platform link, or undefined if nothing is. Exported so
// add-song refuses a bad --<platform> flag before any work.
export function linkProblem(platform: PlatformId, raw: string): string | undefined {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return `"${raw}" isn't a URL`;
  }
  if (url.protocol !== "https:") return "must be https";
  if (!HOSTS[platform](url.hostname)) return `${url.hostname} isn't a ${platform} host`;
  for (const param of url.searchParams.keys()) {
    if (isTracking(param)) return `carries the tracking parameter ${param}`;
  }
  return undefined;
}

function link(value: unknown, path: string, seen: Set<string>) {
  const l = object(value, path, { required: ["platform", "url"] });
  const platform = oneOf(l.platform, PLATFORM_IDS, `${path}.platform`);
  if (seen.has(platform)) throw new CatalogueError(`${path}.platform`, `${platform} is listed more than once`);
  seen.add(platform);
  const problem = linkProblem(platform, text(l.url, `${path}.url`));
  if (problem) throw new CatalogueError(`${path}.url`, problem);
}

function snippet(value: unknown, path: string, trackId: string) {
  const s = object(value, path, { required: ["key", "duration", "bytes", "start", "fadeIn", "fadeOut"] });
  const key = text(s.key, `${path}.key`);
  if (!new RegExp(`^snippets/${trackId}\\.${HASH}\\.m4a$`).test(key)) {
    throw new CatalogueError(`${path}.key`, `"${key}" must be snippets/${trackId}.<8 hex>.m4a`);
  }
  const duration = number(s.duration, `${path}.duration`, { min: 0 });
  if (Math.abs(duration - SNIPPET_LENGTH) > SNIPPET_TOLERANCE + 1e-9) {
    throw new CatalogueError(`${path}.duration`, `${duration} s must be ${SNIPPET_LENGTH} s ± ${SNIPPET_TOLERANCE}`);
  }
  number(s.bytes, `${path}.bytes`, { min: 0, integer: true, above: true });
  number(s.start, `${path}.start`, { min: 0 });
  number(s.fadeIn, `${path}.fadeIn`, { min: 0 });
  number(s.fadeOut, `${path}.fadeOut`, { min: 0 });
}

function cover(value: unknown, path: string, releaseId: string) {
  const c = object(value, path, { required: ["key", "widths", "formats"] });
  const key = text(c.key, `${path}.key`);
  if (!new RegExp(`^covers/${releaseId}\\.${HASH}$`).test(key)) {
    throw new CatalogueError(`${path}.key`, `"${key}" must be covers/${releaseId}.<8 hex>, the stem every size shares`);
  }
  const widths = array(c.widths, `${path}.widths`);
  const ascending = widths.every((w, i) => Number.isInteger(w) && (w as number) > 0 && (i === 0 || (w as number) > (widths[i - 1] as number)));
  if (widths.length === 0 || !ascending) throw new CatalogueError(`${path}.widths`, "must be whole pixel widths, smallest first");
  const formats = array(c.formats, `${path}.formats`);
  formats.forEach((f, i) => oneOf(f, COVER_FORMATS, `${path}.formats[${i}]`));
  if (formats.length === 0 || new Set(formats).size !== formats.length) {
    throw new CatalogueError(`${path}.formats`, "must list each format once");
  }
}

// Strings anywhere in the file, with their paths, so no r2.dev URL can hide
// in a field the other rules don't look at.
function* strings(value: unknown, path: string): Generator<[string, string]> {
  if (typeof value === "string") yield [path, value];
  else if (Array.isArray(value)) for (const [i, v] of value.entries()) yield* strings(v, `${path}[${i}]`);
  else if (typeof value === "object" && value !== null) for (const [k, v] of Object.entries(value)) yield* strings(v, `${path}.${k}`);
}

// allowShortReleases lets an EP or album hold a single track. add-song builds
// one a track per run, so between its first and second runs songs.json holds
// a one-track EP. Only add-song passes it: the site build stays strict, so an
// unfinished EP fails `next build` until its second track joins.
export function parseCatalogue(data: unknown, { allowShortReleases = false }: { allowShortReleases?: boolean } = {}): Catalogue {
  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    throw new CatalogueError("(root)", "the catalogue must be an object");
  }
  for (const [path, s] of strings(data, "")) {
    if (/r2\.dev/i.test(s)) throw new CatalogueError(path.slice(1), "uses r2.dev, which never serves production media");
  }

  const root = object(data, "(root)", { required: ["releases"] });
  const releases = array(root.releases, "releases");
  const releaseIds = new Set<string>();
  const trackIds = new Map<string, string>();
  let featuredAt: string | undefined;
  let previousDate: string | undefined;

  releases.forEach((value, r) => {
    const path = `releases[${r}]`;
    const release = object(value, path, {
      required: ["id", "type", "title", "date", "cover", "tracks", "leadTrackId", "links"],
      optional: ["featured"],
    });

    const releaseId = id(release.id, `${path}.id`);
    if (releaseIds.has(releaseId)) throw new CatalogueError(`${path}.id`, `${releaseId} is already a release id`);
    releaseIds.add(releaseId);

    const type = oneOf(release.type, RELEASE_TYPES, `${path}.type`);
    text(release.title, `${path}.title`);

    const date = isoDate(release.date, `${path}.date`);
    if (previousDate !== undefined && date > previousDate) {
      throw new CatalogueError(`${path}.date`, `${date} is newer than the release before it: releases run newest first`);
    }
    previousDate = date;

    cover(release.cover, `${path}.cover`, releaseId);

    const tracks = array(release.tracks, `${path}.tracks`);
    const fewest = type === "single" || allowShortReleases ? 1 : 2;
    if (type === "single" ? tracks.length !== 1 : tracks.length < fewest) {
      const rule = type === "single" ? "exactly one track" : "two or more tracks: add the next with add-song --release";
      throw new CatalogueError(`${path}.tracks`, `a ${type} has ${rule}, not ${tracks.length}`);
    }
    const ownTrackIds = tracks.map((value, t) => {
      const trackPath = `${path}.tracks[${t}]`;
      const track = object(value, trackPath, { required: ["id", "title", "kind", "snippet"] });
      const trackId = id(track.id, `${trackPath}.id`);
      const earlier = trackIds.get(trackId);
      if (earlier) throw new CatalogueError(`${trackPath}.id`, `${trackId} is already a track id at ${earlier}, and track ids are unique across the catalogue`);
      trackIds.set(trackId, trackPath);
      text(track.title, `${trackPath}.title`);
      oneOf(track.kind, TRACK_KINDS, `${trackPath}.kind`);
      snippet(track.snippet, `${trackPath}.snippet`, trackId);
      return trackId;
    });

    const lead = id(release.leadTrackId, `${path}.leadTrackId`);
    if (!ownTrackIds.includes(lead)) throw new CatalogueError(`${path}.leadTrackId`, `${lead} isn't one of this release's tracks`);

    if ("featured" in release) {
      if (release.featured !== true) throw new CatalogueError(`${path}.featured`, "must be true, or left out");
      if (featuredAt) throw new CatalogueError(`${path}.featured`, `only one release can be featured, and ${featuredAt} already is`);
      featuredAt = path;
    }

    const seen = new Set<string>();
    array(release.links, `${path}.links`).forEach((value, l) => link(value, `${path}.links[${l}]`, seen));
  });

  return data as Catalogue;
}
