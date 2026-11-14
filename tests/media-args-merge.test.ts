import assert from "node:assert/strict";
import { describe, test } from "node:test";
import type { Catalogue, Cover, Snippet } from "../src/catalogue/types.ts";
import { parseCatalogue } from "../src/catalogue/validate.ts";
import { parseAddSongArgs } from "../scripts/media/args.ts";
import { applyMerge, catalogueText, planMerge } from "../scripts/media/merge.ts";

const MASTER = ["--master", "/Masters/x.wav", "--start", "41"];
const args = (...rest: string[]) => parseAddSongArgs([...MASTER, ...rest]);

const snippet = (trackId: string, hash = "aaaaaaaa", start = 41): Snippet => ({
  key: `snippets/${trackId}.${hash}.m4a`,
  duration: 30,
  bytes: 600_000,
  start,
  fadeIn: 0.15,
  fadeOut: 2,
});
const cover = (releaseId: string, hash = "bbbbbbbb"): Cover => ({
  key: `covers/${releaseId}.${hash}`,
  widths: [192, 384, 768, 1080],
  formats: ["avif", "webp"],
});

// The catalogue the merges start from: one EP, then one older single.
const existing = (): Catalogue =>
  parseCatalogue(
    JSON.parse(
      JSON.stringify({
        releases: [
          {
            id: "cant-you-see-ep",
            type: "ep",
            title: "Can't You See",
            date: "2024-03-29",
            cover: cover("cant-you-see-ep"),
            tracks: [
              { id: "cant-you-see", title: "Can't You See", kind: "original", snippet: snippet("cant-you-see") },
              { id: "ukg-333", title: "UKG 333", kind: "original", snippet: snippet("ukg-333") },
            ],
            leadTrackId: "cant-you-see",
            featured: true,
            links: [{ platform: "spotify", url: "https://open.spotify.com/album/4WiQgdIocMx6qgYSmxnTPG" }],
          },
          {
            id: "bring-that-change",
            type: "single",
            title: "Bring That Change",
            date: "2023-09-01",
            cover: cover("bring-that-change"),
            tracks: [{ id: "bring-that-change", title: "Bring That Change", kind: "original", snippet: snippet("bring-that-change") }],
            leadTrackId: "bring-that-change",
            links: [],
          },
        ],
      }),
    ),
  );

describe("parseAddSongArgs", () => {
  test("reads a new single with every kind of flag", () => {
    const a = parseAddSongArgs([
      ...["--master", "~/Masters/vapor city.wav", "--start", "1:02.5", "--title", "Welcome to Vapor_City"],
      ...["--cover", "/Art/vapor.png", "--date", "2025-10-03", "--kind", "remix", "--fade-in", "0.3", "--fade-out", "1.5"],
      ...["--cover-quality", "60", "--crop", "--featured", "--dry-run"],
      ...["--spotify", "https://open.spotify.com/track/5Shwkb85VSY33QZqMDQaqo?si=488bbdd9ee434b68"],
      ...["--bandcamp", "https://thesamegatsby.bandcamp.com/track/welcome-to-vapor-city"],
    ]);
    assert.equal(a.master, "~/Masters/vapor city.wav");
    assert.equal(a.start, 62.5);
    assert.equal(a.title, "Welcome to Vapor_City");
    assert.equal(a.kind, "remix");
    assert.equal(a.fadeIn, 0.3);
    assert.equal(a.fadeOut, 1.5);
    assert.equal(a.coverQuality, 60);
    assert.equal(a.crop, true);
    assert.equal(a.featured, true);
    assert.equal(a.dryRun, true);
    assert.equal(a.replace, false);
    assert.deepEqual(a.links, [
      { platform: "spotify", url: "https://open.spotify.com/track/5Shwkb85VSY33QZqMDQaqo" },
      { platform: "bandcamp", url: "https://thesamegatsby.bandcamp.com/track/welcome-to-vapor-city" },
    ]);
  });

  test("leaves the kind and fades unset unless given, so --replace keeps them", () => {
    const a = args("--title", "X", "--cover", "/c.png", "--date", "2025-01-01");
    assert.equal(a.kind, undefined);
    assert.equal(a.fadeIn, undefined);
    assert.equal(a.type, undefined);
  });

  test("refuses unknown flags and missing required ones", () => {
    assert.throws(() => args("--title", "X", "--napster", "https://x"), /--napster/);
    assert.throws(() => parseAddSongArgs(["--start", "41", "--title", "X"]), /--master/);
    assert.throws(() => parseAddSongArgs(["--master", "/m.wav", "--title", "X"]), /--start/);
    assert.throws(() => args(), /--title/);
    assert.throws(() => args("--title", "X", "stray"), /stray/);
  });

  test("refuses values it can't use, saying which flag", () => {
    assert.throws(() => parseAddSongArgs(["--master", "/m.wav", "--start", "soon", "--title", "X"]), /--start/);
    assert.throws(() => args("--title", "X", "--kind", "bootleg"), /--kind/);
    assert.throws(() => args("--title", "X", "--type", "mixtape"), /--type/);
    assert.throws(() => args("--title", "X", "--fade-in", "-1"), /--fade-in/);
    assert.throws(() => args("--title", "X", "--date", "2023-02-29"), /--date/);
    assert.throws(() => args("--title", "X", "--id", "Not_Kebab"), /--id/);
    assert.throws(() => args("--title", "X", "--cover", "/c.png", "--cover-quality", "101"), /--cover-quality/);
  });

  test("refuses a link on the wrong host, or with a bad scheme", () => {
    assert.throws(() => args("--title", "X", "--spotify", "https://music.apple.com/x"), /--spotify.*music\.apple\.com isn't a spotify host/);
    assert.throws(() => args("--title", "X", "--tidal", "http://tidal.com/album/1"), /--tidal.*https/);
  });

  test("refuses flags that don't go together", () => {
    assert.throws(() => args("--title", "X", "--crop"), /--crop.*--cover/);
    assert.throws(() => args("--title", "X", "--cover-quality", "40"), /--cover-quality.*--cover/);
    assert.throws(() => args("--title", "X", "--release", "cant-you-see-ep", "--type", "ep"), /--type.*--release/);
    assert.throws(() => args("--title", "X", "--release", "cant-you-see-ep", "--date", "2024-01-01"), /--date.*--release/);
    assert.throws(() => args("--title", "X", "--release-title", "Y"), /--release-title.*single/);
    assert.throws(() => args("--title", "X", "--type", "ep"), /--release-title/);
  });
});

describe("planMerge", () => {
  test("a new single needs a cover and a date", () => {
    assert.throws(() => planMerge(existing(), args("--title", "Welcome to Vapor_City", "--date", "2025-10-03")), /--cover/);
    assert.throws(() => planMerge(existing(), args("--title", "Welcome to Vapor_City", "--cover", "/c.png")), /--date/);
    assert.deepEqual(planMerge(existing(), args("--title", "Welcome to Vapor_City", "--cover", "/c.png", "--date", "2025-10-03")), {
      trackId: "welcome-to-vapor-city",
      releaseId: "welcome-to-vapor-city",
      newRelease: true,
      replacing: false,
      buildCover: true,
    });
  });

  test("refuses an existing track id without --replace", () => {
    assert.throws(
      () => planMerge(existing(), args("--title", "UKG 333", "--cover", "/c.png", "--date", "2025-01-01")),
      /ukg-333 is already a track.*--replace/,
    );
  });

  test("refuses a new release whose id is taken", () => {
    const ep = args("--title", "New", "--type", "ep", "--release-title", "Can't You See", "--cover", "/c.png", "--date", "2025-01-01");
    assert.throws(() => planMerge(existing(), ep), /cant-you-see-ep is already a release/);
  });

  test("refuses --release with an id that isn't there, or that's a single", () => {
    assert.throws(() => planMerge(existing(), args("--title", "New", "--release", "nope-ep")), /--release nope-ep.*no release/);
    assert.throws(() => planMerge(existing(), args("--title", "New", "--release", "bring-that-change")), /single/);
  });

  test("refuses a new cover for an existing release without --replace", () => {
    assert.throws(() => planMerge(existing(), args("--title", "New", "--release", "cant-you-see-ep", "--cover", "/c.png")), /--replace/);
  });

  test("refuses --replace when there's nothing to replace", () => {
    assert.throws(() => planMerge(existing(), args("--title", "Brand New", "--replace", "--cover", "/c.png", "--date", "2025-01-01")), /nothing to replace/);
  });
});

describe("applyMerge", () => {
  test("adds a new single in date order, newest first", () => {
    const a = args("--title", "Welcome to Vapor_City", "--cover", "/c.png", "--date", "2025-10-03", "--spotify", "https://open.spotify.com/track/abc");
    const merged = applyMerge(existing(), a, { snippet: snippet("welcome-to-vapor-city"), cover: cover("welcome-to-vapor-city") });
    assert.deepEqual(merged.releases.map((r) => r.id), ["welcome-to-vapor-city", "cant-you-see-ep", "bring-that-change"]);
    assert.deepEqual(merged.releases[0], {
      id: "welcome-to-vapor-city",
      type: "single",
      title: "Welcome to Vapor_City",
      date: "2025-10-03",
      cover: cover("welcome-to-vapor-city"),
      tracks: [{ id: "welcome-to-vapor-city", title: "Welcome to Vapor_City", kind: "original", snippet: snippet("welcome-to-vapor-city") }],
      leadTrackId: "welcome-to-vapor-city",
      links: [{ platform: "spotify", url: "https://open.spotify.com/track/abc" }],
    });
  });

  test("puts an older release further down", () => {
    const a = args("--title", "Old One", "--cover", "/c.png", "--date", "2020-01-01");
    const merged = applyMerge(existing(), a, { snippet: snippet("old-one"), cover: cover("old-one") });
    assert.equal(merged.releases.at(-1)!.id, "old-one");
  });

  test("makes a new EP from its first track, which leads it", () => {
    const a = args("--title", "Side A", "--type", "ep", "--release-title", "Night Drive", "--cover", "/c.png", "--date", "2026-01-01");
    // An EP needs two tracks, so after the first run songs.json holds a
    // one-track EP that add-song accepts and the site build doesn't.
    const plan = planMerge(existing(), a);
    assert.equal(plan.releaseId, "night-drive-ep");
    const withFirst = applyMerge(existing(), a, { snippet: snippet("side-a"), cover: cover("night-drive-ep") });
    assert.throws(() => parseCatalogue(JSON.parse(catalogueText(withFirst))), /two or more/);
    const b = args("--title", "Side B", "--release", "night-drive-ep");
    const merged = applyMerge(withFirst, b, { snippet: snippet("side-b") });
    const ep = merged.releases[0];
    assert.equal(ep.type, "ep");
    assert.deepEqual(ep.tracks.map((t) => t.id), ["side-a", "side-b"]);
    assert.equal(ep.leadTrackId, "side-a");
    assert.doesNotThrow(() => parseCatalogue(JSON.parse(catalogueText(merged))));
  });

  test("joins an existing EP at the end, and --lead makes the new track lead", () => {
    const merged = applyMerge(existing(), args("--title", "Dub", "--kind", "remix", "--release", "cant-you-see-ep", "--lead"), { snippet: snippet("dub") });
    const ep = merged.releases[0];
    assert.deepEqual(ep.tracks.map((t) => t.id), ["cant-you-see", "ukg-333", "dub"]);
    assert.equal(ep.tracks[2].kind, "remix");
    assert.equal(ep.leadTrackId, "dub");
  });

  test("--replace re-cuts a track in place, keeping its position and lead", () => {
    const merged = applyMerge(existing(), args("--title", "UKG 333", "--replace"), { snippet: snippet("ukg-333", "cccccccc", 12) });
    const ep = merged.releases[0];
    assert.deepEqual(ep.tracks.map((t) => t.id), ["cant-you-see", "ukg-333"]);
    assert.equal(ep.tracks[1].snippet.start, 12);
    assert.equal(ep.leadTrackId, "cant-you-see");
    assert.deepEqual(ep.cover, cover("cant-you-see-ep"));
  });

  test("a new track is an original unless --kind says otherwise", () => {
    const merged = applyMerge(existing(), args("--title", "Dub", "--release", "cant-you-see-ep"), { snippet: snippet("dub") });
    assert.equal(merged.releases[0].tracks[2].kind, "original");
  });

  test("--replace keeps a track's kind unless --kind is given", () => {
    const remix = applyMerge(existing(), args("--title", "UKG 333", "--replace", "--kind", "remix"), { snippet: snippet("ukg-333") });
    const again = applyMerge(remix, args("--title", "UKG 333", "--replace"), { snippet: snippet("ukg-333", "abababab") });
    assert.equal(again.releases[0].tracks[1].kind, "remix");
  });

  test("refuses release-level flags on a release that already exists", () => {
    assert.throws(() => planMerge(existing(), args("--title", "UKG 333", "--replace", "--date", "2025-01-01")), /--date.*new release/);
  });

  test("--replace with --cover gives the release a new cover", () => {
    const merged = applyMerge(existing(), args("--title", "Bring That Change", "--replace", "--cover", "/new.png"), {
      snippet: snippet("bring-that-change", "dddddddd"),
      cover: cover("bring-that-change", "eeeeeeee"),
    });
    assert.equal(merged.releases[1].cover.key, "covers/bring-that-change.eeeeeeee");
  });

  test("--featured moves the flag, leaving one featured release", () => {
    const merged = applyMerge(existing(), args("--title", "Bring That Change", "--replace", "--featured"), { snippet: snippet("bring-that-change") });
    assert.equal(merged.releases[0].featured, undefined);
    assert.equal("featured" in merged.releases[0], false);
    assert.equal(merged.releases[1].featured, true);
  });

  test("links set or replace a platform and keep the others, in a fixed order", () => {
    const merged = applyMerge(
      existing(),
      args("--title", "UKG 333", "--replace", "--tidal", "https://tidal.com/album/1", "--spotify", "https://open.spotify.com/album/new"),
      { snippet: snippet("ukg-333") },
    );
    assert.deepEqual(merged.releases[0].links, [
      { platform: "spotify", url: "https://open.spotify.com/album/new" },
      { platform: "tidal", url: "https://tidal.com/album/1" },
    ]);
  });

  test("refuses to build without the cover the plan needs", () => {
    const a = args("--title", "New", "--cover", "/c.png", "--date", "2025-01-01");
    assert.throws(() => applyMerge(existing(), a, { snippet: snippet("new") }), /cover/);
  });

  test("leaves the catalogue it was given alone", () => {
    const before = existing();
    const copy = JSON.stringify(before);
    applyMerge(before, args("--title", "UKG 333", "--replace", "--featured"), { snippet: snippet("ukg-333", "ffffffff") });
    assert.equal(JSON.stringify(before), copy);
  });
});

describe("catalogueText", () => {
  test("is 2-space JSON with a trailing newline, and the same every time", () => {
    const a = args("--title", "Welcome to Vapor_City", "--cover", "/c.png", "--date", "2025-10-03");
    const built = { snippet: snippet("welcome-to-vapor-city"), cover: cover("welcome-to-vapor-city") };
    const one = catalogueText(applyMerge(existing(), a, built));
    const two = catalogueText(applyMerge(existing(), a, built));
    assert.equal(one, two);
    assert.ok(one.endsWith("}\n"));
    assert.ok(one.startsWith('{\n  "releases": [\n    {\n      "id": "welcome-to-vapor-city",'));
    assert.doesNotThrow(() => parseCatalogue(JSON.parse(one)));
  });

  test("writes an empty catalogue as songs.json starts", () => {
    assert.equal(catalogueText({ releases: [] }), '{\n  "releases": []\n}\n');
  });
});
