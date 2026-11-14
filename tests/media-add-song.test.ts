import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, beforeEach, describe, test } from "node:test";
import { promisify } from "node:util";
import { realDeps, runAddSong } from "../scripts/add-song.ts";
import type { AddSongDeps } from "../scripts/add-song.ts";
import { parseAddSongArgs } from "../scripts/media/args.ts";
import type { BuiltCover, CoverInput } from "../scripts/media/covers.ts";
import { lineDiff } from "../scripts/media/diff.ts";
import { COVER_WIDTHS } from "../scripts/media/keys.ts";
import { applyMerge, catalogueText } from "../scripts/media/merge.ts";
import { encodeRgbPng } from "../scripts/media/png.ts";
import type { BuiltSnippet, SnippetInput } from "../scripts/media/snippet.ts";
import { writeWav } from "../scripts/media/wav.ts";

const run = promisify(execFile);
const EMPTY = '{\n  "releases": []\n}\n';

async function stagedFiles(dir: string): Promise<string[]> {
  try {
    return (await readdir(dir, { recursive: true, withFileTypes: true }))
      .filter((e) => e.isFile())
      .map((e) => join(e.parentPath, e.name).slice(dir.length + 1))
      .sort();
  } catch {
    return [];
  }
}

describe("add-song with fake tools", () => {
  let dir: string;
  let deps: AddSongDeps;
  let lines: string[];
  let calls: string[];

  const fakeSnippet = async (input: SnippetInput): Promise<BuiltSnippet> => {
    calls.push(`snippet ${input.trackId} ${input.start}`);
    return {
      key: `snippets/${input.trackId}.0123abcd.m4a`,
      bytes: new Uint8Array(600),
      info: { codec: "aac", channels: 2, sampleRate: 44_100, duration: 30.0000004, bitRate: 160_000 },
      loudness: { loudness: -9.5, truePeak: -0.3, gain: -4.5, shortfall: 0, silent: false },
      firstMediaByte: 8192,
      fadeIn: input.fadeIn ?? 0.15,
      fadeOut: input.fadeOut ?? 2,
    };
  };
  const fakeCover = async (input: CoverInput): Promise<BuiltCover> => {
    calls.push(`cover ${input.releaseId}`);
    const files = new Map<string, Uint8Array>(COVER_WIDTHS.flatMap((w) => [[`${w}.avif`, new Uint8Array(w)], [`${w}.webp`, new Uint8Array(w * 2)]]));
    return { stem: `covers/${input.releaseId}.4567cdef`, files, source: { width: 1200, height: 1200 }, side: 1200, transparentPixels: 0 };
  };

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "add-song-"));
    await writeFile(join(dir, "songs.json"), EMPTY);
    await writeFile(join(dir, "master.wav"), "");
    await writeFile(join(dir, "cover.png"), "");
    lines = [];
    calls = [];
    deps = {
      catalogueFile: join(dir, "songs.json"),
      stageDir: join(dir, ".media"),
      buildSnippet: fakeSnippet,
      buildCover: fakeCover,
      checkCwebp: async () => {},
      log: (line) => lines.push(line),
    };
  });

  const single = (...extra: string[]) => [
    ...["--master", join(dir, "master.wav"), "--start", "1:02.5", "--title", "Welcome to Vapor_City"],
    ...["--cover", join(dir, "cover.png"), "--date", "2025-10-03"],
    ...extra,
  ];

  test("a dry run stages one snippet and eight covers, and leaves songs.json alone", async () => {
    assert.equal(await runAddSong(single("--dry-run"), deps), 0);
    assert.deepEqual(await stagedFiles(deps.stageDir), [
      ...COVER_WIDTHS.flatMap((w) => [`covers/welcome-to-vapor-city.4567cdef.${w}.avif`, `covers/welcome-to-vapor-city.4567cdef.${w}.webp`]).sort(),
      "snippets/welcome-to-vapor-city.0123abcd.m4a",
    ]);
    assert.equal(await readFile(deps.catalogueFile, "utf8"), EMPTY);
    assert.deepEqual(calls, ["snippet welcome-to-vapor-city 62.5", "cover welcome-to-vapor-city"]);
  });

  test("prints the keys, the loudness and the songs.json diff", async () => {
    await runAddSong(single("--dry-run"), deps);
    const out = lines.join("\n");
    assert.match(out, /\.media\/snippets\/welcome-to-vapor-city\.0123abcd\.m4a {2}0\.6 KB/);
    assert.match(out, /measured -9\.50 LUFS with its true peak at -0\.30 dBTP, so -4\.50 dB was applied/);
    assert.match(out, /- {3}"releases": \[\]/);
    assert.match(out, /\+ {7}"id": "welcome-to-vapor-city",/);
    assert.match(out, /\+ {13}"duration": 30,/);
    assert.match(out, /160 kbps, 30 s,/);
    assert.match(out, /afplay \.media\/snippets\/welcome-to-vapor-city\.0123abcd\.m4a/);
  });

  test("warns about a shortfall, a crop, transparency and a one-track EP", async () => {
    deps.buildSnippet = async (input) => ({ ...(await fakeSnippet(input)), loudness: { loudness: -30, truePeak: -2, gain: 1, shortfall: 15, silent: false } });
    deps.buildCover = async (input) => ({ ...(await fakeCover(input)), source: { width: 1469, height: 1457 }, side: 1457, transparentPixels: 12 });
    const ep = [
      ...["--master", join(dir, "master.wav"), "--start", "0", "--title", "Side A", "--type", "ep", "--release-title", "Night Drive"],
      ...["--cover", join(dir, "cover.png"), "--crop", "--date", "2026-01-01", "--dry-run"],
    ];
    assert.equal(await runAddSong(ep, deps), 0);
    const out = lines.join("\n");
    assert.match(out, /15\.00 LU under -14 LUFS/);
    assert.match(out, /cropped to 1457 × 1457/);
    assert.match(out, /12 transparent pixels/);
    assert.match(out, /night-drive-ep has one track: add the next with --release night-drive-ep/);
  });

  for (const [name, argv, message] of [
    ["an unknown flag", () => single("--dry-run", "--napster", "x"), /--napster/],
    ["a bad link", () => single("--dry-run", "--spotify", "https://music.apple.com/x"), /isn't a spotify host/],
    ["a missing master", () => single("--dry-run").map((a) => (a.endsWith("master.wav") ? join(dir, "nope.wav") : a)), /--master .*nope\.wav doesn't exist/],
    ["a missing cover", () => single("--dry-run").map((a) => (a.endsWith("cover.png") ? join(dir, "nope.png") : a)), /--cover .*nope\.png doesn't exist/],
    ["a missing date", () => single("--dry-run").filter((a, i, all) => a !== "--date" && all[i - 1] !== "--date"), /--date/],
    ["no --dry-run", () => single(), /MP-9.*--dry-run/],
  ] as const) {
    test(`stops before building on ${name}, with exit code 1`, async () => {
      assert.equal(await runAddSong(argv(), deps), 1);
      assert.match(lines.join("\n"), message);
      assert.deepEqual(calls, []);
      assert.deepEqual(await stagedFiles(deps.stageDir), []);
    });
  }

  test("stops before building on a clash with the catalogue", async () => {
    // The release already in songs.json, as MP-9 will leave it.
    const existing = applyMerge({ releases: [] }, parseAddSongArgs(single()), {
      snippet: { key: "snippets/welcome-to-vapor-city.0123abcd.m4a", duration: 30, bytes: 600, start: 62.5, fadeIn: 0.15, fadeOut: 2 },
      cover: { key: "covers/welcome-to-vapor-city.4567cdef", widths: [...COVER_WIDTHS], formats: ["avif", "webp"] },
    });
    await writeFile(deps.catalogueFile, catalogueText(existing));
    assert.equal(await runAddSong(single("--dry-run"), deps), 1);
    assert.match(lines.join("\n"), /already a track.*--replace/);
    assert.deepEqual(calls, []);
  });

  test("stops with exit code 1 when a build step fails, leaving songs.json alone", async () => {
    deps.buildCover = async () => {
      throw new Error("sips can't read cover.png as an image");
    };
    assert.equal(await runAddSong(single("--dry-run"), deps), 1);
    assert.match(lines.join("\n"), /sips can't read/);
    assert.equal(await readFile(deps.catalogueFile, "utf8"), EMPTY);
  });
});

describe("the add-song script", () => {
  test("exits 1 on a bad argument, before touching any tool", async () => {
    await assert.rejects(run(process.execPath, ["--disable-warning=MODULE_TYPELESS_PACKAGE_JSON", "scripts/add-song.ts", "--bogus"]), (error: { code: number; stdout: string }) => {
      assert.equal(error.code, 1);
      assert.match(error.stdout, /--bogus/);
      return true;
    });
  });
});

describe("lineDiff", () => {
  test("marks removed and added lines, with context, and elides the rest", () => {
    const before = ["a", "b", "c", "d", "e", "f", "g", "h"].join("\n");
    const after = ["a", "b", "c", "d", "E", "f", "g", "h"].join("\n");
    assert.equal(lineDiff(before, after), ["…", "  c", "  d", "- e", "+ E", "  f", "  g", "…"].join("\n"));
  });

  test("is empty when nothing changed", () => {
    assert.equal(lineDiff("x\ny", "x\ny"), "");
  });
});

// The real afconvert, afinfo, sips and cwebp, so this only runs on a Mac.
describe("a real dry run", { skip: process.platform !== "darwin" && "needs the macOS audio and image tools" }, () => {
  let dir: string;
  let deps: AddSongDeps;
  let lines: string[];

  before(async () => {
    dir = await mkdtemp(join(tmpdir(), "add-song-real-"));
    const rate = 44_100;
    const tone = Array.from({ length: 2 }, (_, c) => {
      const data = new Float32Array(40 * rate);
      for (let i = 0; i < data.length; i++) data[i] = 0.3 * Math.sin((2 * Math.PI * (440 + 220 * c) * i) / rate);
      return data;
    });
    await writeFile(join(dir, "tone.f32.wav"), writeWav({ sampleRate: rate, channels: tone }));
    await run("afconvert", ["-f", "WAVE", "-d", "LEI24", join(dir, "tone.f32.wav"), join(dir, "tone.wav")]);
    const pixels = new Uint8Array(1200 * 1200 * 4);
    for (let i = 0; i < pixels.length; i += 4) pixels.set([(i / 4) % 256, (i / 4800) % 256, 128, 255], i);
    await writeFile(join(dir, "pattern.png"), encodeRgbPng({ width: 1200, height: 1200, pixels }));
    await writeFile(join(dir, "songs.json"), EMPTY);
    lines = [];
    deps = { ...realDeps(), catalogueFile: join(dir, "songs.json"), stageDir: join(dir, ".media"), log: (line) => lines.push(line) };
  });

  after(() => rm(dir, { recursive: true, force: true }));

  test("stages one .m4a and eight covers, and leaves songs.json byte-identical", async () => {
    const argv = [
      ...["--master", join(dir, "tone.wav"), "--start", "5", "--title", "Test Tone"],
      ...["--cover", join(dir, "pattern.png"), "--date", "2026-11-14", "--dry-run"],
    ];
    const code = await runAddSong(argv, deps);
    assert.equal(code, 0, lines.join("\n"));
    const files = await stagedFiles(deps.stageDir);
    assert.equal(files.filter((f) => /^snippets\/test-tone\.[0-9a-f]{8}\.m4a$/.test(f)).length, 1, files.join(", "));
    assert.equal(files.filter((f) => /^covers\/test-tone\.[0-9a-f]{8}\.\d+\.(avif|webp)$/.test(f)).length, 8, files.join(", "));
    assert.equal(await readFile(deps.catalogueFile, "utf8"), EMPTY);
  });
});
