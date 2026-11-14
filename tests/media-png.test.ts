import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { crc32, deflateSync } from "node:zlib";
import { decodePng, encodeRgbPng, flattenOntoBlack } from "../scripts/media/png.ts";
import type { Rgba } from "../scripts/media/png.ts";

// A reference PNG writer for the decoder to read: any colour type and depth,
// with every row filtered by the given filter, as the PNG spec defines them.
function makePng(opts: { width: number; height: number; colourType: number; depth: 8 | 16; filter: number; samples: number[][]; interlace?: number }) {
  const { width, height, colourType, depth, filter, samples } = opts;
  const channels = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[colourType]!;
  const bpp = (channels * depth) / 8;
  const stride = width * bpp;
  const rows = samples.map((rowSamples) => {
    const bytes: number[] = [];
    for (const s of rowSamples) bytes.push(...(depth === 8 ? [s] : [s >> 8, s & 255]));
    return bytes;
  });
  const raw: number[] = [];
  rows.forEach((row, y) => {
    const prev = y > 0 ? rows[y - 1] : new Array(stride).fill(0);
    raw.push(filter);
    for (let i = 0; i < stride; i++) {
      const left = i >= bpp ? row[i - bpp] : 0;
      const up = prev[i];
      const upLeft = i >= bpp ? prev[i - bpp] : 0;
      const p = left + up - upLeft;
      const paeth = Math.abs(p - left) <= Math.abs(p - up) && Math.abs(p - left) <= Math.abs(p - upLeft) ? left : Math.abs(p - up) <= Math.abs(p - upLeft) ? up : upLeft;
      const predicted = [0, left, up, (left + up) >> 1, paeth][filter];
      raw.push((row[i] - predicted) & 255);
    }
  });
  const chunk = (type: string, data: Uint8Array) => {
    const body = Buffer.concat([Buffer.from(type, "latin1"), data]);
    const head = Buffer.alloc(4);
    head.writeUInt32BE(data.length);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body));
    return Buffer.concat([head, body, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = depth;
  ihdr[9] = colourType;
  ihdr[12] = opts.interlace ?? 0;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("tEXt", Buffer.from("Comment\0GPS 51.5, -0.1", "latin1")),
    chunk("IDAT", deflateSync(Buffer.from(raw))),
    chunk("IEND", new Uint8Array(0)),
  ]);
}

// A 3 × 2 RGBA image with every channel different, so a mix-up shows.
const RGBA_ROWS = [
  [10, 20, 30, 255, 200, 150, 100, 255, 1, 2, 3, 128],
  [250, 5, 60, 0, 70, 80, 90, 255, 33, 66, 99, 255],
];
const rgbaOf = (rows: number[][]) => Uint8Array.from(rows.flat());

const chunkTypes = (bytes: Uint8Array) => {
  const buf = Buffer.from(bytes);
  const types: string[] = [];
  for (let at = 8; at < buf.length; at += 12 + buf.readUInt32BE(at)) types.push(buf.toString("latin1", at + 4, at + 8));
  return types;
};

describe("decodePng", () => {
  for (const filter of [0, 1, 2, 3, 4]) {
    test(`undoes filter ${filter}`, () => {
      const png = makePng({ width: 3, height: 2, colourType: 6, depth: 8, filter, samples: RGBA_ROWS });
      assert.deepEqual(decodePng(png), { width: 3, height: 2, pixels: rgbaOf(RGBA_ROWS) });
    });
  }

  test("reads RGB as opaque, and 16-bit samples by their high byte", () => {
    const rgb16 = makePng({ width: 2, height: 1, colourType: 2, depth: 16, filter: 4, samples: [[0x1234, 0xabcd, 0xff00, 0x0001, 0x8080, 0xfedc]] });
    assert.deepEqual([...decodePng(rgb16).pixels], [0x12, 0xab, 0xff, 255, 0x00, 0x80, 0xfe, 255]);
  });

  test("spreads grey, with and without alpha, across red, green and blue", () => {
    const grey = makePng({ width: 2, height: 1, colourType: 0, depth: 8, filter: 1, samples: [[7, 200]] });
    assert.deepEqual([...decodePng(grey).pixels], [7, 7, 7, 255, 200, 200, 200, 255]);
    const greyAlpha = makePng({ width: 1, height: 1, colourType: 4, depth: 8, filter: 0, samples: [[90, 40]] });
    assert.deepEqual([...decodePng(greyAlpha).pixels], [90, 90, 90, 40]);
  });

  test("refuses palette and interlaced images, and anything that isn't a PNG", () => {
    assert.throws(() => decodePng(makePng({ width: 1, height: 1, colourType: 3, depth: 8, filter: 0, samples: [[0]] })), /colour type 3/);
    assert.throws(() => decodePng(makePng({ width: 1, height: 1, colourType: 2, depth: 8, filter: 0, samples: [[1, 2, 3]], interlace: 1 })), /interlaced/);
    assert.throws(() => decodePng(new TextEncoder().encode("GIF89a")), /isn't a PNG/);
  });

  test("refuses a file cut off inside a chunk", () => {
    const png = makePng({ width: 3, height: 2, colourType: 6, depth: 8, filter: 0, samples: RGBA_ROWS });
    assert.throws(() => decodePng(png.subarray(0, png.length - 20)), /cut off/);
  });
});

describe("flattenOntoBlack", () => {
  test("composites onto black, counting the pixels that weren't opaque", () => {
    const image: Rgba = { width: 3, height: 2, pixels: rgbaOf(RGBA_ROWS) };
    assert.equal(flattenOntoBlack(image), 2);
    assert.deepEqual(
      [...image.pixels],
      [10, 20, 30, 255, 200, 150, 100, 255, 1, 1, 2, 255, 0, 0, 0, 255, 70, 80, 90, 255, 33, 66, 99, 255],
    );
  });

  test("leaves an opaque image alone", () => {
    const pixels = Uint8Array.of(9, 8, 7, 255);
    assert.equal(flattenOntoBlack({ width: 1, height: 1, pixels }), 0);
    assert.deepEqual([...pixels], [9, 8, 7, 255]);
  });
});

describe("encodeRgbPng", () => {
  test("round trips through decodePng, and drops alpha", () => {
    const image: Rgba = { width: 3, height: 2, pixels: rgbaOf(RGBA_ROWS) };
    flattenOntoBlack(image);
    assert.deepEqual(decodePng(encodeRgbPng(image)), image);
  });

  test("writes only the pixels and an sRGB tag, so no source metadata survives", () => {
    const source = decodePng(makePng({ width: 3, height: 2, colourType: 6, depth: 8, filter: 2, samples: RGBA_ROWS }));
    assert.deepEqual(chunkTypes(encodeRgbPng(source)), ["IHDR", "sRGB", "IDAT", "IEND"]);
  });

  test("gives the same bytes every time", () => {
    const image: Rgba = { width: 3, height: 2, pixels: rgbaOf(RGBA_ROWS) };
    assert.deepEqual(encodeRgbPng(image), encodeRgbPng(image));
  });
});
