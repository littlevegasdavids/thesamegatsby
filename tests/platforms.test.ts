import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";
import { ICONS, MARK_VIEWBOX, STAND_IN_ICONS, STAND_IN_VIEWBOX } from "../src/design-system/assets/icon-paths.ts";
import { MAIN_PLATFORMS, MORE_PLATFORMS, PLATFORMS, splitLinks } from "../src/design-system/platforms.ts";
import type { PlatformId, StreamLink } from "../src/design-system/types.ts";

const read = (path: string) => readFileSync(new URL(`../src/design-system/${path}`, import.meta.url), "utf8");
const tsx = read("assets/icons.tsx").replace(/\/\/.*$/gm, "");
const source = read("assets/icons-source.md");

const link = (platform: PlatformId): StreamLink => ({ platform, url: `https://example.com/${platform}` });
const ids = (links: StreamLink[]) => links.map((l) => l.platform);

describe("the platforms", () => {
  test("put the five main ones first, in the spec's fixed order", () => {
    assert.deepEqual(MAIN_PLATFORMS, ["spotify", "apple-music", "youtube-music", "soundcloud", "bandcamp"]);
  });

  test("keep Amazon Music, Deezer and Tidal under More, in that order", () => {
    assert.deepEqual(MORE_PLATFORMS, ["amazon-music", "deezer", "tidal"]);
  });

  test("give each its full label, and the 360 px bar's short one", () => {
    assert.deepEqual(
      [...MAIN_PLATFORMS, ...MORE_PLATFORMS].map((id) => `${PLATFORMS[id].label} / ${PLATFORMS[id].short}`),
      [
        "Spotify / Spotify",
        "Apple Music / Apple Music",
        "YouTube Music / YouTube",
        "SoundCloud / SoundCloud",
        "Bandcamp / Bandcamp",
        "Amazon Music / Amazon",
        "Deezer / Deezer",
        "Tidal / Tidal",
      ],
    );
  });
});

describe("splitLinks", () => {
  test("puts links in the fixed order, whatever order they come in", () => {
    const { main, more } = splitLinks(
      (["tidal", "bandcamp", "spotify", "deezer", "soundcloud", "amazon-music", "youtube-music", "apple-music"] as const).map(link),
    );
    assert.deepEqual(ids(main), ["spotify", "apple-music", "youtube-music", "soundcloud", "bandcamp"]);
    assert.deepEqual(ids(more), ["amazon-music", "deezer", "tidal"]);
  });

  test("leaves out a main platform the release isn't on", () => {
    const { main } = splitLinks((["spotify", "apple-music", "soundcloud", "bandcamp"] as const).map(link));
    assert.deepEqual(ids(main), ["spotify", "apple-music", "soundcloud", "bandcamp"]);
  });

  test("returns an empty more when there are no extras", () => {
    const { more } = splitLinks(MAIN_PLATFORMS.map(link));
    assert.deepEqual(more, []);
  });

  test("keeps the extras the release has, and only those", () => {
    const { main, more } = splitLinks((["deezer", "spotify"] as const).map(link));
    assert.deepEqual(ids(main), ["spotify"]);
    assert.deepEqual(ids(more), ["deezer"]);
  });

  test("keeps the first link when a platform is listed twice", () => {
    const { main } = splitLinks([link("spotify"), { platform: "spotify", url: "https://example.com/second" }]);
    assert.deepEqual(main, [link("spotify")]);
  });

  test("returns the links themselves, URLs untouched", () => {
    const links = MAIN_PLATFORMS.map(link);
    assert.deepEqual(splitLinks(links).main, links);
  });
});

describe("the icons", () => {
  test("cover the eight platforms and the two socials", () => {
    assert.deepEqual(Object.keys(ICONS).sort(), [
      "amazon-music",
      "apple-music",
      "bandcamp",
      "deezer",
      "instagram",
      "soundcloud",
      "spotify",
      "tidal",
      "tiktok",
      "youtube-music",
    ]);
  });

  test("are path data alone", () => {
    for (const [id, { d }] of Object.entries(ICONS)) {
      assert.match(d, /^[MmZzLlHhVvCcSsQqTtAa0-9.,\s-]+$/, `${id}'s path`);
    }
  });

  test("give the 24-unit marks 2 units of air, like the canvas's line icons", () => {
    assert.equal(MARK_VIEWBOX, "-2 -2 28 28");
    assert.equal(STAND_IN_VIEWBOX, "0 0 24 24");
    assert.match(tsx, /viewBox=\{stroke \? STAND_IN_VIEWBOX : MARK_VIEWBOX\}/);
  });

  test("mark the one stand-in, Amazon Music, which is stroked like the canvas's", () => {
    assert.deepEqual(STAND_IN_ICONS, ["amazon-music"]);
    for (const [id, { stroke }] of Object.entries(ICONS)) {
      assert.equal(stroke, id === "amazon-music", `${id}'s stroke`);
    }
  });

  test("paint in currentColor only, so a parent sets their colour", () => {
    assert.match(tsx, /fill=\{stroke \? "none" : "currentColor"\}/);
    assert.match(tsx, /stroke=\{stroke \? "currentColor" : undefined\}/);
    assert.doesNotMatch(tsx, /#[0-9a-f]{3,8}\b/i);
  });

  test("are hidden from assistive tech, since the link carries the name", () => {
    assert.match(tsx, /aria-hidden/);
    assert.doesNotMatch(tsx, /<title|role=/);
  });
});

describe("icons-source.md", () => {
  test("names Simple Icons 16.36.0 and its CC0 licence", () => {
    assert.match(source, /Simple Icons 16\.36\.0/);
    assert.match(source, /CC0 1\.0/);
  });

  test("lists each downloaded file", () => {
    for (const slug of ["spotify", "applemusic", "youtubemusic", "soundcloud", "bandcamp", "deezer", "tidal", "instagram", "tiktok"]) {
      assert.match(source, new RegExp(`\`${slug}\\.svg\``), slug);
    }
  });

  test("says Amazon Music is a stand-in, to replace before launch", () => {
    assert.match(source, /Amazon Music/);
    assert.match(source, /stand-in/);
    assert.match(source, /before (public )?launch/);
  });
});
