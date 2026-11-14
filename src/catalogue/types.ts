// The same ids as design-system's view types, which site's mapping relies on.
// They're declared again here because media-pipeline doesn't depend on
// design-system. tests/catalogue.test.ts checks the two lists match.
export const PLATFORM_IDS = [
  "spotify",
  "apple-music",
  "youtube-music",
  "soundcloud",
  "bandcamp",
  "amazon-music",
  "deezer",
  "tidal",
] as const;
export const RELEASE_TYPES = ["single", "ep", "album"] as const;
export const TRACK_KINDS = ["original", "remix", "edit"] as const;
export const COVER_FORMATS = ["avif", "webp"] as const;

export type PlatformId = (typeof PLATFORM_IDS)[number];
export type ReleaseType = (typeof RELEASE_TYPES)[number];
export type TrackKind = (typeof TRACK_KINDS)[number];
export type CoverFormat = (typeof COVER_FORMATS)[number];

export type Snippet = {
  key: string; // "snippets/welcome-to-vapor-city.3f9a1c2e.m4a"
  duration: number; // seconds, read back from the encoded file: 30.00
  bytes: number;
  start: number; // where it was cut from the master, in seconds, so a re-cut can start from it
  fadeIn: number;
  fadeOut: number;
};

export type Cover = {
  key: string; // "covers/cant-you-see-ep.9b04d7aa", the stem every size shares
  widths: readonly number[]; // [192, 384, 768, 1080]
  formats: readonly CoverFormat[]; // ["avif", "webp"]
};

export type CatalogueTrack = { id: string; title: string; kind: TrackKind; snippet: Snippet };

export type CatalogueLink = { platform: PlatformId; url: string };

export type CatalogueRelease = {
  id: string;
  type: ReleaseType;
  title: string;
  date: string; // "2025-10-03", the release date, which orders the list
  cover: Cover;
  tracks: readonly CatalogueTrack[]; // in tracklist order
  leadTrackId: string;
  featured?: true; // the hero shows this release instead of the newest
  links: readonly CatalogueLink[];
};

export type Catalogue = { releases: readonly CatalogueRelease[] };
