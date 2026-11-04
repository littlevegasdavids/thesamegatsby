// The shapes the components render. media-pipeline's catalogue comes later,
// and site maps it onto these, so the design system never imports the
// catalogue or audio-engine.

export type PlatformId =
  | "spotify"
  | "apple-music"
  | "youtube-music"
  | "soundcloud"
  | "bandcamp"
  | "amazon-music"
  | "deezer"
  | "tidal";

export type StreamLink = { platform: PlatformId; url: string };

export type SocialNetwork = "instagram" | "tiktok";

// The handle is stored without its "@", which the components add.
export type SocialLink = { network: SocialNetwork; handle: string; url: string };

// Remixes and edits are a kind of track, not a release type: a remix can come
// out as a single or sit on an EP (SPEC.md).
export type TrackKind = "original" | "remix" | "edit";

// duration is the snippet's length in seconds, which is what every row and
// the readout show, not the full song's.
export type Track = { id: string; title: string; kind: TrackKind; duration: number };

export type ReleaseType = "single" | "ep" | "album";

// cover is the URL of a square image. links are the release's own, in any
// order: the components put them in the fixed platform order.
export type Release = {
  id: string;
  type: ReleaseType;
  title: string;
  cover: string;
  tracks: readonly Track[];
  leadTrackId: string;
  links: readonly StreamLink[];
};
