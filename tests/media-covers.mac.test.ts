import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, describe, test } from "node:test";
import { promisify } from "node:util";
import { crc32, deflateSync } from "node:zlib";
import { buildCover } from "../scripts/media/covers.ts";
import type { BuiltCover } from "../scripts/media/covers.ts";
import { COVER_WIDTHS } from "../scripts/media/keys.ts";
import { encodeRgbPng } from "../scripts/media/png.ts";

// The real sips and cwebp, so this only runs on a Mac.
const skip = process.platform !== "darwin" && "needs sips and cwebp, which only the Mac has";
const run = promisify(execFile);

// A test pattern: colour gradients with a checkerboard over them, so resizing
// and colour mistakes show.
function pattern(width: number, height: number) {
  const pixels = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const check = ((x >> 5) + (y >> 5)) % 2 ? 40 : 0;
      pixels.set([Math.min(255, Math.round((x / width) * 255) + check), Math.round((y / height) * 255), 128 + check, 255], i);
    }
  }
  return { width, height, pixels };
}

const chunk = (type: string, data: Uint8Array) => {
  const body = Buffer.concat([Buffer.from(type, "latin1"), data]);
  const head = Buffer.alloc(4);
  head.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([head, body, crc]);
};

// TIFF, big-endian: IFD0 holds one entry, GPSInfo (0x8825), pointing at an
// empty GPS IFD.
const GPS_EXIF = Buffer.from([0x4d, 0x4d, 0, 42, 0, 0, 0, 8, 0, 1, 0x88, 0x25, 0, 4, 0, 0, 0, 1, 0, 0, 0, 26, 0, 0, 0, 0, 0, 0, 0, 0]);

// An RGBA PNG with a transparent corner and GPS EXIF. encodeRgbPng only
// writes RGB, so this one is written directly.
function rgbaPng(width: number, height: number, transparentCorner: number) {
  const image = pattern(width, height);
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const from = (y * width + x) * 4;
      const to = y * (width * 4 + 1) + 1 + x * 4;
      raw.set(image.pixels.subarray(from, from + 3), to);
      raw[to + 3] = x < transparentCorner && y < transparentCorner ? 0 : 255;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("sRGB", Uint8Array.of(0)),
    chunk("eXIf", GPS_EXIF),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", new Uint8Array(0)),
  ]);
}

// Every TIFF tag in an AVIF's Exif item, following the Exif sub-IFD.
function avifExifTags(bytes: Uint8Array): number[] {
  const buf = Buffer.from(bytes);
  // The item's data is "Exif\0\0" then a TIFF header. The infe box that
  // declares the item also holds "Exif\0\0", so match the header too.
  const big = buf.indexOf(Buffer.from("Exif\0\0MM\0*", "latin1"));
  const at = big !== -1 ? big : buf.indexOf(Buffer.from("Exif\0\0II*\0", "latin1"));
  if (at === -1) return [];
  const tiff = at + 6;
  const u16 = (o: number) => (big !== -1 ? buf.readUInt16BE(tiff + o) : buf.readUInt16LE(tiff + o));
  const u32 = (o: number) => (big !== -1 ? buf.readUInt32BE(tiff + o) : buf.readUInt32LE(tiff + o));
  const tags: number[] = [];
  const ifd = (offset: number) => {
    for (let n = u16(offset), e = 0; e < n; e++) {
      const entry = offset + 2 + e * 12;
      const tag = u16(entry);
      tags.push(tag);
      if (tag === 0x8769 || tag === 0x8825) ifd(u32(entry + 8));
    }
  };
  ifd(u32(4));
  return tags;
}

function webpChunks(bytes: Uint8Array): string[] {
  const buf = Buffer.from(bytes);
  assert.equal(buf.toString("latin1", 0, 4), "RIFF");
  assert.equal(buf.toString("latin1", 8, 12), "WEBP");
  const types: string[] = [];
  for (let at = 12; at + 8 <= buf.length; ) {
    const size = buf.readUInt32LE(at + 4);
    types.push(buf.toString("latin1", at, at + 4));
    at += 8 + size + (size & 1);
  }
  return types;
}

async function sipsSize(file: string) {
  const { stdout } = await run("sips", ["-g", "pixelWidth", "-g", "pixelHeight", "-g", "profile", file]);
  return {
    width: Number(/pixelWidth: (\d+)/.exec(stdout)?.[1]),
    height: Number(/pixelHeight: (\d+)/.exec(stdout)?.[1]),
    profile: /profile: (.*)/.exec(stdout)?.[1].trim(),
  };
}

test("the Exif check finds a GPS pointer when there is one", () => {
  assert.deepEqual(avifExifTags(Buffer.concat([Buffer.from("Exif\0\0", "latin1"), GPS_EXIF])), [0x8825]);
});

describe("the cover build", { skip }, () => {
  let dir: string;
  let first: BuiltCover;
  let second: BuiltCover;

  before(async () => {
    dir = await mkdtemp(join(tmpdir(), "cover-"));
    const source = join(dir, "pattern.png");
    await writeFile(source, rgbaPng(1200, 1200, 100));
    first = await buildCover({ source, releaseId: "test-pattern", workDir: join(dir, "one") });
    second = await buildCover({ source, releaseId: "test-pattern", workDir: join(dir, "two") });
    const sizes = [...first.files].map(([slot, bytes]) => `${slot} ${(bytes.length / 1024).toFixed(1)} KB`);
    console.log(`cover: ${first.stem}, ${first.transparentPixels} transparent px flattened; ${sizes.join(", ")}`);
  });

  after(() => rm(dir, { recursive: true, force: true }));

  test("makes eight files, square, at the four widths", async () => {
    assert.deepEqual([...first.files.keys()].sort(), COVER_WIDTHS.flatMap((w) => [`${w}.avif`, `${w}.webp`]).sort());
    for (const [slot, bytes] of first.files) {
      const file = join(dir, `check.${slot}`);
      await writeFile(file, bytes);
      const { width, height } = await sipsSize(file);
      const expected = Number(slot.split(".")[0]);
      assert.equal(width, expected, slot);
      assert.equal(height, expected, slot);
    }
  });

  test("keeps the colours sRGB", async () => {
    for (const width of COVER_WIDTHS) {
      const file = join(dir, `colour.${width}.avif`);
      await writeFile(file, first.files.get(`${width}.avif`)!);
      assert.equal((await sipsSize(file)).profile, "sRGB IEC61966-2.1", `${width}.avif`);
      // An untagged WebP is sRGB by definition, so no ICC chunk is expected.
      assert.ok(!webpChunks(first.files.get(`${width}.webp`)!).includes("ICCP"), `${width}.webp`);
    }
  });

  test("carries no EXIF or GPS from the source", () => {
    for (const [slot, bytes] of first.files) {
      if (slot.endsWith(".webp")) {
        const chunks = webpChunks(bytes);
        assert.ok(!chunks.includes("EXIF") && !chunks.includes("XMP "), `${slot}: ${chunks.join(" ")}`);
      } else {
        // sips writes its own Exif item into small AVIFs: the colour space
        // and pixel size. Nothing else is allowed, and never a GPS pointer.
        const tags = avifExifTags(bytes);
        assert.ok(!tags.includes(0x8825), `${slot} has a GPS pointer`);
        assert.ok(tags.every((t) => [0x8769, 0xa001, 0xa002, 0xa003].includes(t)), `${slot} Exif tags ${tags.map((t) => t.toString(16))}`);
      }
    }
  });

  test("flattens the transparent corner and counts it", () => {
    assert.equal(first.transparentPixels, 100 * 100);
  });

  test("gives byte-identical files and the same stem on a second run", () => {
    assert.equal(second.stem, first.stem);
    for (const [slot, bytes] of first.files) assert.deepEqual(second.files.get(slot), bytes, slot);
    assert.match(first.stem, /^covers\/test-pattern\.[0-9a-f]{8}$/);
  });
});

describe("a cover that isn't usable", { skip }, () => {
  let dir: string;
  before(async () => (dir = await mkdtemp(join(tmpdir(), "cover-bad-"))));
  after(() => rm(dir, { recursive: true, force: true }));

  test("is refused when it isn't square, unless --crop centre-crops it", async () => {
    const source = join(dir, "wide.png");
    await writeFile(source, encodeRgbPng(pattern(1200, 1180)));
    await assert.rejects(buildCover({ source, releaseId: "wide", workDir: join(dir, "a") }), /1200 × 1180, not square.*--crop/);
    const cropped = await buildCover({ source, releaseId: "wide", crop: true, workDir: join(dir, "b") });
    assert.equal(cropped.side, 1180);
    const big = join(dir, "check.png");
    await writeFile(big, cropped.files.get("1080.avif")!);
    assert.deepEqual(await sipsSize(big).then(({ width, height }) => [width, height]), [1080, 1080]);
  });

  test("is refused under 1080 px, with or without --crop", async () => {
    const source = join(dir, "small.png");
    await writeFile(source, encodeRgbPng(pattern(1000, 1000)));
    await assert.rejects(buildCover({ source, releaseId: "small", workDir: join(dir, "c") }), /1000 px across, under the 1080/);
    await assert.rejects(buildCover({ source, releaseId: "small", crop: true, workDir: join(dir, "d") }), /under the 1080/);
  });

  test("is refused with a quality outside 0–100", async () => {
    await assert.rejects(buildCover({ source: "x.png", releaseId: "q", quality: 101, workDir: dir }), /--cover-quality/);
  });
});
