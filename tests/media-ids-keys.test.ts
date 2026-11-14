import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { FIXTURE_RELEASES } from "../src/app/system/fixtures.ts";
import { parseCatalogue } from "../src/catalogue/validate.ts";
import { releaseId, trackId } from "../scripts/media/ids.ts";
import { COVER_WIDTHS, coverHash, coverStem, shortHash, snippetKey } from "../scripts/media/keys.ts";
import { cleanLink, platformFromFlag } from "../scripts/media/links.ts";
import { songs } from "../songs/index.ts";

const bytes = (...values: number[]) => Uint8Array.from(values);

describe("ids", () => {
  test("come from the title as kebab-case ASCII", () => {
    assert.equal(trackId("Welcome to Vapor_City"), "welcome-to-vapor-city");
    assert.equal(trackId("Can't You See"), "cant-you-see");
    assert.equal(trackId("Give me that KaiZen"), "give-me-that-kaizen");
    assert.equal(trackId("UKG 333"), "ukg-333");
    assert.equal(trackId("You who could be Forever"), "you-who-could-be-forever");
  });

  test("drop accents, curly apostrophes and stray punctuation", () => {
    assert.equal(trackId("Déjà Gatsby"), "deja-gatsby");
    assert.equal(trackId("Can’t  You -- See!"), "cant-you-see");
    assert.equal(trackId("  (Edit) "), "edit");
  });

  test("refuse a title with nothing to make an id from", () => {
    assert.throws(() => trackId("!!!"), /--id/);
    assert.throws(() => trackId("夢"), /--id/);
  });

  test("give an EP or album its own suffix, and a single its track's id", () => {
    assert.equal(releaseId("Can't You See", "ep"), "cant-you-see-ep");
    assert.equal(releaseId("Can't You See", "album"), "cant-you-see-album");
    assert.equal(releaseId("Welcome to Vapor_City", "single"), "welcome-to-vapor-city");
  });
});

describe("keys", () => {
  test("hash to the first 8 hex characters of a SHA-256", () => {
    // SHA-256("abc") starts ba7816bf.
    assert.equal(shortHash(new TextEncoder().encode("abc")), "ba7816bf");
  });

  test("give the same snippet key for the same bytes, and a new one for any change", () => {
    const audio = bytes(1, 2, 3, 4);
    assert.equal(snippetKey("ukg-333", audio), snippetKey("ukg-333", bytes(1, 2, 3, 4)));
    assert.notEqual(snippetKey("ukg-333", audio), snippetKey("ukg-333", bytes(1, 2, 3, 5)));
    assert.match(snippetKey("ukg-333", audio), /^snippets\/ukg-333\.[0-9a-f]{8}\.m4a$/);
  });

  const coverFiles = () =>
    new Map<string, Uint8Array>(
      COVER_WIDTHS.flatMap((width, w) => [
        [`${width}.avif`, bytes(w, 0)] as const,
        [`${width}.webp`, bytes(w, 1)] as const,
      ]),
    );

  test("hash a cover over its eight files, however they're passed in", () => {
    const files = coverFiles();
    const shuffled = new Map([...files].reverse());
    assert.equal(files.size, 8);
    assert.equal(coverHash(files), coverHash(shuffled));
  });

  test("give a cover a new hash when any file changes or two swap places", () => {
    const files = coverFiles();
    const changed = coverFiles();
    changed.set("768.webp", bytes(2, 9));
    const swapped = coverFiles();
    swapped.set("192.avif", files.get("384.avif")!);
    swapped.set("384.avif", files.get("192.avif")!);
    assert.notEqual(coverHash(files), coverHash(changed));
    assert.notEqual(coverHash(files), coverHash(swapped));
  });

  test("don't let bytes slide between files to give the same hash", () => {
    const a = coverFiles();
    const b = coverFiles();
    a.set("192.avif", bytes(0, 0, 7));
    a.set("192.webp", bytes(0));
    b.set("192.avif", bytes(0, 0));
    b.set("192.webp", bytes(7, 0));
    assert.notEqual(coverHash(a), coverHash(b));
  });

  test("refuse a cover that's missing a file or has an extra one", () => {
    const missing = coverFiles();
    missing.delete("1080.webp");
    assert.throws(() => coverHash(missing), /1080\.webp/);
    const extra = coverFiles();
    extra.set("2048.avif", bytes(1));
    assert.throws(() => coverHash(extra), /2048\.avif/);
  });

  test("pass the catalogue's key patterns", () => {
    const key = snippetKey("cant-you-see", bytes(5));
    const stem = coverStem("cant-you-see-ep", coverHash(coverFiles()));
    const snippet = { key, duration: 30, bytes: 1, start: 0, fadeIn: 0.15, fadeOut: 2 };
    const ukg = { ...snippet, key: snippetKey("ukg-333", bytes(6)) };
    const catalogue = {
      releases: [
        {
          id: "cant-you-see-ep",
          type: "ep",
          title: "Can't You See",
          date: "2024-03-29",
          cover: { key: stem, widths: [...COVER_WIDTHS], formats: ["avif", "webp"] },
          tracks: [
            { id: "cant-you-see", title: "Can't You See", kind: "original", snippet },
            { id: "ukg-333", title: "UKG 333", kind: "original", snippet: ukg },
          ],
          leadTrackId: "cant-you-see",
          links: [],
        },
      ],
    };
    assert.doesNotThrow(() => parseCatalogue(catalogue));
  });
});

describe("links", () => {
  test("strip si and utm_* and keep the rest exactly as written", () => {
    assert.equal(cleanLink("https://open.spotify.com/track/abc?si=488bbdd9ee434b68"), "https://open.spotify.com/track/abc");
    assert.equal(
      cleanLink("https://soundcloud.com/dejagatsby/ukg-333?utm_source=clipboard&in=dejagatsby/sets/cant-you-see-ep&utm_medium=text"),
      "https://soundcloud.com/dejagatsby/ukg-333?in=dejagatsby/sets/cant-you-see-ep",
    );
    assert.equal(cleanLink("https://music.apple.com/za/album/x/1708120323?i=1708120324"), "https://music.apple.com/za/album/x/1708120323?i=1708120324");
  });

  test("keep a YouTube video's id and drop the playlist it was shared from", () => {
    assert.equal(cleanLink("https://www.youtube.com/watch?v=3NtCoWZeQFU&list=OLAK5uy_nx&index=2"), "https://www.youtube.com/watch?v=3NtCoWZeQFU");
    assert.equal(cleanLink("https://music.youtube.com/playlist?list=OLAK5uy_nx&si=x"), "https://music.youtube.com/playlist?list=OLAK5uy_nx");
  });

  test("refuse something that isn't a URL", () => {
    assert.throws(() => cleanLink("open.spotify.com/track/abc"), /URL/);
  });

  test("clean the old site's links into the /system fixture's hand-cleaned ones", () => {
    // The fixture keeps the five releases, so UKG 333's links (it's on the EP) aren't there.
    const fixtureUrls = new Set(FIXTURE_RELEASES.flatMap((release) => release.links.map((link) => link.url)));
    const old = songs.filter((song) => song.title !== "UKG 333");
    assert.equal(old.length, 5);
    for (const song of old) {
      for (const url of [song.spotifyLink, song.appleMusicLink, song.youtubeLink, song.soundcloudLink]) {
        assert.ok(fixtureUrls.has(cleanLink(url)), `${cleanLink(url)} (from ${url}) isn't in the fixture`);
      }
    }
  });

  test("map each --<platform> flag to its platform id", () => {
    assert.equal(platformFromFlag("--spotify"), "spotify");
    assert.equal(platformFromFlag("--apple-music"), "apple-music");
    assert.equal(platformFromFlag("--amazon-music"), "amazon-music");
    assert.equal(platformFromFlag("--tidal"), "tidal");
    assert.equal(platformFromFlag("--napster"), undefined);
    assert.equal(platformFromFlag("spotify"), undefined);
  });
});
