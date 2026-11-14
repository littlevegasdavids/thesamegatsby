import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { catalogue } from "../src/catalogue/index.ts";
import { MEDIA_ORIGIN, coverSrcSet, coverUrl, snippetUrl } from "../src/catalogue/media.ts";
import { PLATFORM_IDS, RELEASE_TYPES, TRACK_KINDS } from "../src/catalogue/types.ts";
import type { Cover, PlatformId, ReleaseType, Snippet, TrackKind } from "../src/catalogue/types.ts";
import { parseCatalogue } from "../src/catalogue/validate.ts";
import { PLATFORMS } from "../src/design-system/platforms.ts";
import type * as DS from "../src/design-system/types.ts";

// A valid catalogue: a single and an EP, newest first. Each failing case
// below breaks one thing in a fresh copy of it.
type Data = {
  releases: {
    id: string;
    type: string;
    title: string;
    date: string;
    featured?: unknown;
    cover: { key: string; widths: unknown[]; formats: unknown[] };
    tracks: {
      id: string;
      title: string;
      kind: string;
      snippet: { key: string; duration: number; bytes: number; start: number; fadeIn: number; fadeOut: number };
    }[];
    leadTrackId: string;
    links: { platform: string; url: string }[];
    [extra: string]: unknown;
  }[];
};

const snippet = (id: string, hash: string) => ({
  key: `snippets/${id}.${hash}.m4a`,
  duration: 30,
  bytes: 600_000,
  start: 41,
  fadeIn: 0.15,
  fadeOut: 2,
});

const valid = (): Data => ({
  releases: [
    {
      id: "welcome-to-vapor-city",
      type: "single",
      title: "Welcome to Vapor_City",
      date: "2025-10-03",
      cover: { key: "covers/welcome-to-vapor-city.1a2b3c4d", widths: [192, 384, 768, 1080], formats: ["avif", "webp"] },
      tracks: [
        { id: "welcome-to-vapor-city", title: "Welcome to Vapor_City", kind: "original", snippet: snippet("welcome-to-vapor-city", "3f9a1c2e") },
      ],
      leadTrackId: "welcome-to-vapor-city",
      links: [
        { platform: "spotify", url: "https://open.spotify.com/track/abc" },
        { platform: "bandcamp", url: "https://thesamegatsby.bandcamp.com/track/welcome-to-vapor-city" },
      ],
    },
    {
      id: "cant-you-see-ep",
      type: "ep",
      title: "Can't You See",
      date: "2024-03-29",
      featured: true,
      cover: { key: "covers/cant-you-see-ep.9b04d7aa", widths: [192, 384, 768, 1080], formats: ["avif", "webp"] },
      tracks: [
        { id: "cant-you-see", title: "Can't You See", kind: "original", snippet: snippet("cant-you-see", "0011aabb") },
        { id: "ukg-333", title: "UKG 333", kind: "remix", snippet: snippet("ukg-333", "ccdd2233") },
      ],
      leadTrackId: "cant-you-see",
      links: [
        { platform: "apple-music", url: "https://music.apple.com/za/album/cant-you-see/1" },
        { platform: "youtube-music", url: "https://music.youtube.com/playlist?list=OLAK5" },
        { platform: "soundcloud", url: "https://soundcloud.com/thesamegatsby/sets/cant-you-see" },
        { platform: "amazon-music", url: "https://music.amazon.co.uk/albums/B0" },
        { platform: "deezer", url: "https://www.deezer.com/album/1" },
        { platform: "tidal", url: "https://tidal.com/browse/album/1" },
      ],
    },
  ],
});

// Breaks a fresh valid catalogue and checks parseCatalogue() names the field.
function rejects(field: RegExp, breakIt: (data: Data) => void) {
  const data = valid();
  breakIt(data);
  assert.throws(() => parseCatalogue(data), (error: Error) => {
    assert.match(error.message, field);
    return true;
  });
}

const single = (data: Data) => data.releases[0];
const ep = (data: Data) => data.releases[1];

describe("parseCatalogue()", () => {
  test("accepts the valid catalogue and returns it unchanged", () => {
    const data = valid();
    assert.deepEqual(parseCatalogue(data), data);
  });

  test("refuses anything that isn't a catalogue", () => {
    assert.throws(() => parseCatalogue(null), /catalogue/);
    assert.throws(() => parseCatalogue({}), /releases/);
    assert.throws(() => parseCatalogue({ releases: {} }), /releases/);
  });

  test("refuses unknown fields, so a misspelt hand edit isn't ignored", () => {
    rejects(/releases\[1\]\.featurd/, (d) => {
      delete ep(d).featured;
      ep(d).featurd = true;
    });
  });

  describe("ids", () => {
    test("accepts kebab-case ids with digits", () => {
      const data = valid();
      ep(data).tracks[1].id = "ukg-333";
      assert.doesNotThrow(() => parseCatalogue(data));
    });

    test("refuses an id that isn't kebab-case", () => {
      rejects(/releases\[0\]\.id/, (d) => (single(d).id = "Welcome_To"));
      rejects(/releases\[1\]\.tracks\[1\]\.id/, (d) => (ep(d).tracks[1].id = "ukg--333"));
    });

    test("refuses a repeated release id", () => {
      rejects(/releases\[1\]\.id.*welcome-to-vapor-city/, (d) => {
        ep(d).id = "welcome-to-vapor-city";
        ep(d).cover.key = "covers/welcome-to-vapor-city.9b04d7aa";
      });
    });

    test("refuses a track id repeated in another release", () => {
      rejects(/releases\[1\]\.tracks\[0\]\.id.*welcome-to-vapor-city/, (d) => {
        const track = ep(d).tracks[0];
        track.id = "welcome-to-vapor-city";
        track.snippet.key = "snippets/welcome-to-vapor-city.0011aabb.m4a";
        ep(d).leadTrackId = "welcome-to-vapor-city";
      });
    });
  });

  describe("track counts", () => {
    test("a single has exactly one track", () => {
      rejects(/releases\[0\]\.tracks/, (d) => single(d).tracks.push(...ep(valid()).tracks.slice(1)));
      rejects(/releases\[0\]\.tracks/, (d) => (single(d).tracks = []));
    });

    test("an EP or album has two or more", () => {
      const data = valid();
      ep(data).type = "album";
      assert.doesNotThrow(() => parseCatalogue(data));
      rejects(/releases\[1\]\.tracks/, (d) => ep(d).tracks.pop());
    });
  });

  describe("leadTrackId and featured", () => {
    test("leadTrackId may name any of the release's own tracks", () => {
      const data = valid();
      ep(data).leadTrackId = "ukg-333";
      assert.doesNotThrow(() => parseCatalogue(data));
    });

    test("leadTrackId must name one of the release's own tracks", () => {
      rejects(/releases\[1\]\.leadTrackId/, (d) => (ep(d).leadTrackId = "welcome-to-vapor-city"));
    });

    test("featured is true or absent, and at most one release has it", () => {
      rejects(/releases\[1\]\.featured/, (d) => (ep(d).featured = false));
      rejects(/releases\[1\]\.featured.*releases\[0\]/, (d) => (single(d).featured = true));
    });
  });

  describe("dates", () => {
    test("accepts real ISO dates, newest first, with ties allowed", () => {
      const data = valid();
      ep(data).date = "2025-10-03";
      assert.doesNotThrow(() => parseCatalogue(data));
      const leap = valid();
      ep(leap).date = "2024-02-29";
      assert.doesNotThrow(() => parseCatalogue(leap));
    });

    test("refuses a date that isn't a real day", () => {
      rejects(/releases\[1\]\.date/, (d) => (ep(d).date = "2023-02-29"));
      rejects(/releases\[1\]\.date/, (d) => (ep(d).date = "2024-13-01"));
      rejects(/releases\[1\]\.date/, (d) => (ep(d).date = "29/03/2024"));
    });

    test("refuses releases out of order", () => {
      rejects(/releases\[1\]\.date.*newest first/, (d) => (ep(d).date = "2026-01-01"));
    });
  });

  describe("keys", () => {
    test("refuses a snippet key that doesn't name its own track", () => {
      rejects(/releases\[1\]\.tracks\[1\]\.snippet\.key/, (d) => (ep(d).tracks[1].snippet.key = "snippets/cant-you-see.ccdd2233.m4a"));
    });

    test("refuses a snippet key in the wrong shape", () => {
      rejects(/snippet\.key/, (d) => (ep(d).tracks[1].snippet.key = "snippets/ukg-333.CCDD2233.m4a"));
      rejects(/snippet\.key/, (d) => (ep(d).tracks[1].snippet.key = "snippets/ukg-333.ccdd22.m4a"));
      rejects(/snippet\.key/, (d) => (ep(d).tracks[1].snippet.key = "/music/ukg-333/audio.m4a"));
    });

    test("refuses a cover key that doesn't name its own release", () => {
      rejects(/releases\[1\]\.cover\.key/, (d) => (ep(d).cover.key = "covers/cant-you-see.9b04d7aa"));
      rejects(/releases\[1\]\.cover\.key/, (d) => (ep(d).cover.key = "covers/cant-you-see-ep.9b04d7aa.768.avif"));
    });

    test("refuses cover widths and formats that can't be built", () => {
      rejects(/cover\.widths/, (d) => (ep(d).cover.widths = []));
      rejects(/cover\.widths/, (d) => (ep(d).cover.widths = [384, 192]));
      rejects(/cover\.widths/, (d) => (ep(d).cover.widths = [192.5]));
      rejects(/cover\.formats/, (d) => (ep(d).cover.formats = ["jpeg"]));
      rejects(/cover\.formats/, (d) => (ep(d).cover.formats = ["avif", "avif"]));
    });
  });

  describe("snippets", () => {
    test("accepts a duration within 0.05 s of 30", () => {
      const data = valid();
      ep(data).tracks[0].snippet.duration = 30.05;
      ep(data).tracks[1].snippet.duration = 29.95;
      assert.doesNotThrow(() => parseCatalogue(data));
    });

    test("refuses a duration further out", () => {
      rejects(/tracks\[0\]\.snippet\.duration/, (d) => (ep(d).tracks[0].snippet.duration = 30.06));
      rejects(/tracks\[0\]\.snippet\.duration/, (d) => (ep(d).tracks[0].snippet.duration = 15));
    });

    test("refuses bytes, start and fades that aren't usable numbers", () => {
      rejects(/snippet\.bytes/, (d) => (ep(d).tracks[0].snippet.bytes = 0));
      rejects(/snippet\.start/, (d) => (ep(d).tracks[0].snippet.start = -1));
      rejects(/snippet\.fadeOut/, (d) => (ep(d).tracks[0].snippet.fadeOut = Number.NaN));
    });

    test("refuses an unknown track kind", () => {
      rejects(/tracks\[1\]\.kind/, (d) => (ep(d).tracks[1].kind = "bootleg"));
    });
  });

  describe("links", () => {
    test("accepts every platform's hosts", () => {
      const urls: [PlatformId, string][] = [
        ["spotify", "https://open.spotify.com/album/x"],
        ["apple-music", "https://music.apple.com/za/album/x/1"],
        ["youtube-music", "https://www.youtube.com/watch?v=x"],
        ["soundcloud", "https://soundcloud.com/thesamegatsby/x"],
        ["bandcamp", "https://thesamegatsby.bandcamp.com/album/x"],
        ["amazon-music", "https://music.amazon.com/albums/x"],
        ["deezer", "https://link.deezer.com/s/x"],
        ["tidal", "https://listen.tidal.com/album/1"],
      ];
      const data = valid();
      ep(data).links = urls.map(([platform, url]) => ({ platform, url }));
      assert.doesNotThrow(() => parseCatalogue(data));
    });

    test("refuses a link on another platform's host", () => {
      rejects(/releases\[0\]\.links\[0\]\.url.*spotify/, (d) => (single(d).links[0].url = "https://music.apple.com/x"));
      rejects(/links\[1\]\.url/, (d) => (single(d).links[1].url = "https://bandcamp.com.evil.example/x"));
      rejects(/links\[3\]\.url/, (d) => (ep(d).links[3].url = "https://www.amazon.com/music/x"));
    });

    test("refuses a link that isn't https", () => {
      rejects(/links\[0\]\.url.*https/, (d) => (single(d).links[0].url = "http://open.spotify.com/track/abc"));
      rejects(/links\[0\]\.url/, (d) => (single(d).links[0].url = "not a url"));
    });

    test("refuses a platform listed twice, or one that doesn't exist", () => {
      rejects(/links\[1\]\.platform.*spotify/, (d) => (single(d).links[1] = { platform: "spotify", url: "https://open.spotify.com/track/def" }));
      rejects(/links\[1\]\.platform/, (d) => (single(d).links[1] = { platform: "napster", url: "https://napster.com/x" }));
    });

    test("refuses tracking parameters", () => {
      rejects(/links\[0\]\.url.*si/, (d) => (single(d).links[0].url = "https://open.spotify.com/track/abc?si=123"));
      rejects(/links\[1\]\.url.*utm_source/, (d) => (ep(d).links[1].url = "https://music.youtube.com/playlist?list=OLAK5&utm_source=ig"));
    });

    test("keeps parameters that aren't tracking", () => {
      const data = valid();
      ep(data).links[1].url = "https://music.youtube.com/watch?v=x&list=OLAK5";
      assert.doesNotThrow(() => parseCatalogue(data));
    });
  });

  test("refuses r2.dev anywhere", () => {
    rejects(/r2\.dev/, (d) => (single(d).title = "https://pub-abc.r2.dev/x"));
    rejects(/r2\.dev/, (d) => (ep(d).links[4].url = "https://www.deezer.com/album/1?next=pub-abc.r2.dev"));
  });
});

describe("the media URLs", () => {
  const snippetOf: Snippet = snippet("welcome-to-vapor-city", "3f9a1c2e");
  const cover: Cover = { key: "covers/cant-you-see-ep.9b04d7aa", widths: [192, 384, 768, 1080], formats: ["avif", "webp"] };

  test("point at the media domain", () => {
    assert.equal(MEDIA_ORIGIN, "https://media.thesamegatsby.com");
  });

  test("build the spec's example URLs", () => {
    assert.equal(snippetUrl(snippetOf), "https://media.thesamegatsby.com/snippets/welcome-to-vapor-city.3f9a1c2e.m4a");
    assert.equal(coverUrl(cover, 768, "avif"), "https://media.thesamegatsby.com/covers/cant-you-see-ep.9b04d7aa.768.avif");
    assert.equal(
      coverSrcSet(cover, "webp"),
      [192, 384, 768, 1080].map((w) => `https://media.thesamegatsby.com/covers/cant-you-see-ep.9b04d7aa.${w}.webp ${w}w`).join(", "),
    );
  });
});

describe("the committed catalogue", () => {
  test("passes validation", () => {
    assert.ok(Array.isArray(catalogue.releases));
  });
});

// The catalogue repeats design-system's ids rather than importing them, so
// these keep the two lists from drifting apart.
type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
const platformsMatch: Same<PlatformId, DS.PlatformId> = true;
const releaseTypesMatch: Same<ReleaseType, DS.ReleaseType> = true;
const trackKindsMatch: Same<TrackKind, DS.TrackKind> = true;

describe("the ids design-system shares", () => {
  test("match its types", () => {
    assert.ok(platformsMatch && releaseTypesMatch && trackKindsMatch);
  });

  test("list every platform design-system draws, and only those", () => {
    assert.deepEqual([...PLATFORM_IDS].sort(), Object.keys(PLATFORMS).sort());
  });

  test("list each release type and track kind once", () => {
    assert.deepEqual(RELEASE_TYPES, ["single", "ep", "album"]);
    assert.deepEqual(TRACK_KINDS, ["original", "remix", "edit"]);
  });
});
