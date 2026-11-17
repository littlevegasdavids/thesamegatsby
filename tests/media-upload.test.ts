import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeEach, describe, test } from "node:test";
import { runAddSong } from "../scripts/add-song.ts";
import type { AddSongDeps } from "../scripts/add-song.ts";
import { runCheckMedia } from "../scripts/check-media.ts";
import type { BuiltCover, CoverInput } from "../scripts/media/covers.ts";
import { COVER_WIDTHS } from "../scripts/media/keys.ts";
import type { BuiltSnippet, SnippetInput } from "../scripts/media/snippet.ts";
import { CACHE_CONTROL, checkHead, contentTypeFor, wranglerPutArgs } from "../scripts/media/upload.ts";
import type { Head, MediaTools } from "../scripts/media/upload.ts";

const EMPTY = '{\n  "releases": []\n}\n';

describe("the upload rules", () => {
  test("give each file its content type by extension", () => {
    assert.equal(contentTypeFor("snippets/x.0123abcd.m4a"), "audio/mp4");
    assert.equal(contentTypeFor("covers/x.0123abcd.768.avif"), "image/avif");
    assert.equal(contentTypeFor("covers/x.0123abcd.768.webp"), "image/webp");
    assert.throws(() => contentTypeFor("covers/x.png"), /png/);
  });

  test("put each file with its type, the immutable cache-control and --remote", () => {
    assert.equal(CACHE_CONTROL, "public, max-age=31536000, immutable");
    assert.deepEqual(wranglerPutArgs("snippets/x.0123abcd.m4a", "/stage/snippets/x.0123abcd.m4a"), [
      "--no-install",
      "wrangler",
      "r2",
      "object",
      "put",
      "thesamegatsby-media/snippets/x.0123abcd.m4a",
      "--file",
      "/stage/snippets/x.0123abcd.m4a",
      "--content-type",
      "audio/mp4",
      "--cache-control",
      "public, max-age=31536000, immutable",
      "--remote",
    ]);
  });

  const good: Head = { status: 200, contentType: "audio/mp4", cacheControl: CACHE_CONTROL, contentLength: 600 };

  test("pass a HEAD with 200, the type, the cache-control and the size", () => {
    assert.equal(checkHead("snippets/x.0123abcd.m4a", good, 600), undefined);
    assert.equal(checkHead("snippets/x.0123abcd.m4a", good), undefined); // size unknown, as for covers in check-media
  });

  test("fail a HEAD that's wrong in any of them, saying what", () => {
    const key = "snippets/x.0123abcd.m4a";
    assert.match(checkHead(key, { ...good, status: 404 }, 600)!, /404/);
    assert.match(checkHead(key, { ...good, contentType: "application/octet-stream" }, 600)!, /content-type application\/octet-stream/);
    assert.match(checkHead(key, { ...good, cacheControl: "max-age=14400" }, 600)!, /cache-control max-age=14400/);
    assert.match(checkHead(key, { ...good, contentLength: 599 }, 600)!, /599 bytes, not 600/);
  });
});

describe("add-song, live, with fake tools", () => {
  let dir: string;
  let deps: AddSongDeps;
  let lines: string[];
  let events: string[];
  let media: MediaTools;

  const fakeSnippet = async (input: SnippetInput): Promise<BuiltSnippet> => ({
    key: `snippets/${input.trackId}.0123abcd.m4a`,
    bytes: new Uint8Array(600),
    info: { codec: "aac", channels: 2, sampleRate: 48_000, duration: 30, bitRate: 160_000 },
    loudness: { loudness: -10, truePeak: 0.9, gain: -4, shortfall: 0, silent: false },
    firstMediaByte: 8192,
    fadeIn: 2,
    fadeOut: 2,
  });
  const fakeCover = async (input: CoverInput): Promise<BuiltCover> => ({
    stem: `covers/${input.releaseId}.4567cdef`,
    files: new Map(COVER_WIDTHS.flatMap((w) => [[`${w}.avif`, new Uint8Array(w)], [`${w}.webp`, new Uint8Array(w * 2)]])),
    source: { width: 1600, height: 1600 },
    side: 1600,
    transparentPixels: 0,
  });

  // A bucket in memory: put stores the size, and head answers from it.
  const fakeMedia = (): MediaTools => {
    const stored = new Map<string, { size: number; type: string }>();
    return {
      whoami: async () => {
        events.push("whoami");
      },
      put: async (key, file, type) => {
        events.push(`put ${key}`);
        stored.set(key, { size: (await readFile(file)).length, type });
      },
      head: async (key) => {
        events.push(`head ${key}`);
        const object = stored.get(key);
        return object
          ? { status: 200, contentType: object.type, cacheControl: CACHE_CONTROL, contentLength: object.size }
          : { status: 404, contentType: undefined, cacheControl: undefined, contentLength: undefined };
      },
    };
  };

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "add-song-live-"));
    await writeFile(join(dir, "songs.json"), EMPTY);
    await writeFile(join(dir, "master.wav"), "");
    await writeFile(join(dir, "cover.png"), "");
    lines = [];
    events = [];
    media = fakeMedia();
    deps = {
      catalogueFile: join(dir, "songs.json"),
      stageDir: join(dir, ".media"),
      buildSnippet: async (input) => {
        events.push("build snippet");
        return fakeSnippet(input);
      },
      buildCover: async (input) => {
        events.push("build cover");
        return fakeCover(input);
      },
      checkCwebp: async () => {},
      media,
      log: (line) => lines.push(line),
    };
  });

  const argv = (...extra: string[]) => [
    ...["--master", join(dir, "master.wav"), "--start", "3:56", "--title", "Bring That Change"],
    ...["--cover", join(dir, "cover.png"), "--date", "2023-09-19"],
    ...extra,
  ];

  test("builds, uploads, verifies, then writes songs.json, in that order", async () => {
    assert.equal(await runAddSong(argv(), deps), 0, lines.join("\n"));
    const puts = events.filter((e) => e.startsWith("put "));
    const heads = events.filter((e) => e.startsWith("head "));
    assert.equal(puts.length, 9);
    assert.equal(heads.length, 9);
    assert.equal(events[0], "whoami");
    assert.ok(events.indexOf("build cover") < events.indexOf(puts[0]));
    assert.ok(events.lastIndexOf(puts.at(-1)!) < events.indexOf(heads[0]), "every put comes before the first HEAD");

    const written = JSON.parse(await readFile(deps.catalogueFile, "utf8"));
    assert.equal(written.releases[0].id, "bring-that-change");
    assert.equal(written.releases[0].tracks[0].snippet.key, "snippets/bring-that-change.0123abcd.m4a");
    assert.ok((await readFile(deps.catalogueFile, "utf8")).endsWith("}\n"));
    assert.match(lines.join("\n"), /Uploaded and checked 9 files.*songs\.json/s);
  });

  test("puts each file with its own content type", async () => {
    const types: string[] = [];
    deps.media = { ...media, put: async (key, file, type) => (types.push(`${key.split(".").at(-1)} ${type}`), media.put(key, file, type)) };
    await runAddSong(argv(), deps);
    assert.deepEqual([...new Set(types)].sort(), ["avif image/avif", "m4a audio/mp4", "webp image/webp"]);
  });

  const failures: [string, (m: MediaTools) => MediaTools, RegExp, boolean][] = [
    ["Wrangler isn't logged in", (m) => ({ ...m, whoami: async () => Promise.reject(new Error("add-song: Wrangler isn't logged in: run npx wrangler login")) }), /wrangler login/, false],
    ["an upload fails half way", (m) => {
      let n = 0;
      return { ...m, put: async (k, f, t) => (++n === 5 ? Promise.reject(new Error("wrangler r2 object put failed")) : m.put(k, f, t)) };
    }, /put failed/, true],
    ["a key isn't live", (m) => ({ ...m, head: async (k) => (k.endsWith("768.webp") ? { status: 404, contentType: undefined, cacheControl: undefined, contentLength: undefined } : m.head(k)) }), /768\.webp.*404/, true],
    ["a key has the wrong size", (m) => ({ ...m, head: async (k) => ({ ...(await m.head(k)), contentLength: k.endsWith(".m4a") ? 1 : (await m.head(k)).contentLength }) }), /m4a.*1 bytes, not 600/, true],
    ["a key has the wrong cache-control", (m) => ({ ...m, head: async (k) => ({ ...(await m.head(k)), cacheControl: "max-age=14400" }) }), /cache-control max-age=14400/, true],
  ];

  for (const [name, breakIt, message, built] of failures) {
    test(`leaves songs.json byte-identical and exits 1 when ${name}`, async () => {
      deps.media = breakIt(media);
      assert.equal(await runAddSong(argv(), deps), 1);
      assert.match(lines.join("\n"), message);
      assert.equal(await readFile(deps.catalogueFile, "utf8"), EMPTY);
      assert.equal(events.includes("build snippet"), built, built ? "built before the failure" : "stopped before building");
    });
  }

  test("a dry run never touches R2", async () => {
    deps.media = {
      whoami: async () => assert.fail("whoami on a dry run"),
      put: async () => assert.fail("put on a dry run"),
      head: async () => assert.fail("head on a dry run"),
    };
    assert.equal(await runAddSong(argv("--dry-run"), deps), 0, lines.join("\n"));
    assert.equal(await readFile(deps.catalogueFile, "utf8"), EMPTY);
  });
});

describe("check-media", () => {
  const catalogue = {
    releases: [
      {
        id: "bring-that-change",
        type: "single",
        title: "Bring That Change",
        date: "2023-09-19",
        cover: { key: "covers/bring-that-change.4567cdef", widths: [192, 384, 768, 1080], formats: ["avif", "webp"] },
        tracks: [
          {
            id: "bring-that-change",
            title: "Bring That Change",
            kind: "original",
            snippet: { key: "snippets/bring-that-change.0123abcd.m4a", duration: 30, bytes: 600, start: 236, fadeIn: 2, fadeOut: 2 },
          },
        ],
        leadTrackId: "bring-that-change",
        links: [],
      },
    ],
  };

  let file: string;
  let lines: string[];
  beforeEach(async () => {
    file = join(await mkdtemp(join(tmpdir(), "check-media-")), "songs.json");
    await writeFile(file, JSON.stringify(catalogue));
    lines = [];
  });

  const live = async (key: string): Promise<Head> => ({
    status: 200,
    contentType: contentTypeFor(key),
    cacheControl: CACHE_CONTROL,
    contentLength: key.endsWith(".m4a") ? 600 : 1234,
  });

  test("HEADs every snippet and cover file in the catalogue", async () => {
    const asked: string[] = [];
    const code = await runCheckMedia({ catalogueFile: file, head: async (k) => (asked.push(k), live(k)), log: (l) => lines.push(l) });
    assert.equal(code, 0, lines.join("\n"));
    assert.equal(asked.length, 9);
    assert.ok(asked.includes("snippets/bring-that-change.0123abcd.m4a"));
    assert.ok(asked.includes("covers/bring-that-change.4567cdef.1080.webp"));
    assert.match(lines.join("\n"), /9 of 9 keys live/);
  });

  test("exits 1, naming the key, when one isn't right", async () => {
    const head = async (k: string) => (k.endsWith("384.avif") ? { ...(await live(k)), status: 404 } : live(k));
    assert.equal(await runCheckMedia({ catalogueFile: file, head, log: (l) => lines.push(l) }), 1);
    assert.match(lines.join("\n"), /covers\/bring-that-change\.4567cdef\.384\.avif.*404/);
  });

  test("checks a snippet's size against the catalogue", async () => {
    const head = async (k: string) => ({ ...(await live(k)), contentLength: k.endsWith(".m4a") ? 5 : 1234 });
    assert.equal(await runCheckMedia({ catalogueFile: file, head, log: (l) => lines.push(l) }), 1);
    assert.match(lines.join("\n"), /5 bytes, not 600/);
  });
});
