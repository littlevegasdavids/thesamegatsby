import type { Release, SocialLink, StreamLink, Track } from "../../design-system/types.ts";

// The /system bench's catalogue: the five real releases, newest first, with
// the canvas's bracketed examples placed among them as Main.dc.html places
// them (an album, an edit and a remix), so the filter's every type shows.
// The real links are the current site's, as the canvas trims them. Bandcamp
// is the artist page until media-pipeline collects per-release links.

const BANDCAMP = "https://thesamegatsby.bandcamp.com";
const COVERS = "/system-fixtures";
const PLACEHOLDER = `${COVERS}/placeholder.svg`;

// Snippets are 30 s (SPEC.md, confirmed assumption 1).
const SNIPPET = 30;

const track = (id: string, title: string, kind: Track["kind"] = "original"): Track => ({
  id,
  title,
  kind,
  duration: SNIPPET,
});

const real = (spotify: string, appleMusic: string, youtubeMusic: string, soundcloud: string): StreamLink[] => [
  { platform: "spotify", url: spotify },
  { platform: "apple-music", url: appleMusic },
  { platform: "youtube-music", url: youtubeMusic },
  { platform: "soundcloud", url: soundcloud },
  { platform: "bandcamp", url: BANDCAMP },
];

// The examples link nowhere, but they carry every platform, so /system can
// show "More" with all three extras behind it.
const EXAMPLE_LINKS: StreamLink[] = (
  ["spotify", "apple-music", "youtube-music", "soundcloud", "bandcamp", "amazon-music", "deezer", "tidal"] as const
).map((platform) => ({ platform, url: "#" }));

const single = (id: string, title: string, cover: string, links: StreamLink[], kind?: Track["kind"]): Release => ({
  id,
  type: "single",
  title,
  cover,
  tracks: [track(id, title, kind)],
  leadTrackId: id,
  links,
});

const ALBUM_TRACKS = Array.from({ length: 8 }, (_, i) => track(`album-x-${i + 1}`, `[Album track ${i + 1}]`));

export const FIXTURE_RELEASES: readonly Release[] = [
  {
    id: "album-x",
    type: "album",
    title: "[Album title]",
    cover: PLACEHOLDER,
    tracks: ALBUM_TRACKS,
    leadTrackId: ALBUM_TRACKS[0].id,
    links: EXAMPLE_LINKS,
  },
  single(
    "vapor-city",
    "Welcome to Vapor_City",
    `${COVERS}/welcome-to-vapor-city.jpg`,
    real(
      "https://open.spotify.com/track/5Shwkb85VSY33QZqMDQaqo",
      "https://music.apple.com/us/album/welcome-to-vapor-city-single/1845517676",
      "https://www.youtube.com/watch?v=e-12woa2MTU",
      "https://soundcloud.com/dejagatsby/welcome-to-vapor_city",
    ),
  ),
  single("edit-x", "[Track title] (Edit)", PLACEHOLDER, EXAMPLE_LINKS, "edit"),
  single(
    "kaizen",
    "Give me that KaiZen",
    `${COVERS}/give-me-that-kaizen.jpg`,
    real(
      "https://open.spotify.com/album/0ATTxFkDlXZgVnoXe5zQiB",
      "https://music.apple.com/us/album/give-me-that-kaizen-single/1803499620",
      "https://www.youtube.com/watch?v=3NtCoWZeQFU",
      "https://soundcloud.com/dejagatsby/sets/give-me-that-kaizen",
    ),
  ),
  single(
    "forever",
    "You who could be Forever",
    `${COVERS}/you-who-could-be-forever.jpg`,
    real(
      "https://open.spotify.com/album/6KnDL1oCSeCVK7hpor4T3s",
      "https://music.apple.com/us/album/you-who-could-be-forever-single/1750669404",
      "https://www.youtube.com/watch?v=mqdVuGzM-1s",
      "https://soundcloud.com/dejagatsby/you-who-could-be-forever",
    ),
  ),
  single("remix-x", "[Track title] ([Artist] Remix)", PLACEHOLDER, EXAMPLE_LINKS, "remix"),
  {
    id: "cant-you-see-ep",
    type: "ep",
    title: "Can't You See",
    cover: `${COVERS}/cant-you-see.jpg`,
    // UKG 333 has no cover of its own. It's on the EP, so it shows the EP's.
    tracks: [track("cant-you-see", "Can't You See"), track("ukg-333", "UKG 333")],
    leadTrackId: "cant-you-see",
    links: real(
      "https://open.spotify.com/album/4WiQgdIocMx6qgYSmxnTPG",
      "https://music.apple.com/lk/song/cant-you-see/1732276178",
      "https://www.youtube.com/watch?v=qAU3CmPXcRs",
      "https://soundcloud.com/dejagatsby/sets/cant-you-see-ep/",
    ),
  },
  single(
    "bring-that-change",
    "Bring That Change",
    `${COVERS}/bring-that-change.jpg`,
    real(
      "https://open.spotify.com/track/09QlqIRHu7X9DmGK0vdDvQ",
      "https://music.apple.com/za/album/bring-that-change/1708120323?i=1708120324",
      "https://www.youtube.com/watch?v=aZ5cKAAMU2U",
      "https://soundcloud.com/dejagatsby/bring-that-change",
    ),
  ),
];

export const FIXTURE_SOCIALS: readonly SocialLink[] = [
  { network: "instagram", handle: "thesamegatsby", url: "https://www.instagram.com/thesamegatsby" },
  { network: "tiktok", handle: "thesamegatsby", url: "https://www.tiktok.com/@thesamegatsby" },
];
