import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { checkFastStart, topLevelBoxes, zeroTimestamps } from "../scripts/media/mp4.ts";

// Hand-built MP4s. A box is a 32-bit size, a four-character type, then its
// payload. A full box (mvhd, tkhd, mdhd) starts with a version byte and three
// flag bytes, then its creation and modification times: 32-bit in version 0,
// 64-bit in version 1.
const u32 = (n: number) => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
const u64 = (n: bigint) => [...u32(Number(n >> 32n)), ...u32(Number(n & 0xffffffffn))];
const ascii = (s: string) => [...s].map((c) => c.charCodeAt(0));

const box = (type: string, ...payload: number[][]) => {
  const body = payload.flat();
  return [...u32(8 + body.length), ...ascii(type), ...body];
};

// Times, then a recognisable tail so the test can see nothing else moved.
const fullBox = (type: string, version: 0 | 1, created: number, modified: number, tail: number[]) =>
  box(type, [version, 0, 0, 1], version === 0 ? [...u32(created), ...u32(modified)] : [...u64(BigInt(created)), ...u64(BigInt(modified))], tail);

const CREATED = 0xe1a2b3c4;
const MODIFIED = 0xe1a2b3c5;

function movie(version: 0 | 1 = 0) {
  return box(
    "moov",
    fullBox("mvhd", version, CREATED, MODIFIED, [0, 0, 0xac, 0x44, 1, 2, 3, 4]),
    box(
      "trak",
      fullBox("tkhd", version, CREATED, MODIFIED, [0, 0, 0, 1, 5, 6, 7, 8]),
      box("mdia", fullBox("mdhd", version, CREATED, MODIFIED, [0, 0, 0xac, 0x44, 9, 10]), box("hdlr", [0, 0, 0, 0, ...ascii("soun")])),
    ),
  );
}

const ftyp = box("ftyp", ascii("M4A "), u32(0), ascii("M4A mp42isom"));
const free = box("free", [0, 0, 0, 0]);
const mdat = box("mdat", [0xff, 0xf1, 0x50, 0x80, 0xde, 0xad]);

const file = (...boxes: number[][]) => Uint8Array.from(boxes.flat());
const fastStart = (version: 0 | 1 = 0) => file(ftyp, movie(version), free, mdat);

// Every byte offset where the fixture's original times sit.
function timeOffsets(bytes: Uint8Array, version: 0 | 1) {
  const width = version === 0 ? 4 : 8;
  const offsets: number[] = [];
  for (const type of ["mvhd", "tkhd", "mdhd"]) {
    const at = Buffer.from(bytes).indexOf(type) + 4 + 4; // past the type, version and flags
    offsets.push(at, at + width);
  }
  return { offsets, width };
}

describe("the box walk", () => {
  test("reports the top-level boxes in order, with their offsets and sizes", () => {
    const bytes = fastStart();
    const boxes = topLevelBoxes(bytes);
    assert.deepEqual(
      boxes.map((b) => b.type),
      ["ftyp", "moov", "free", "mdat"],
    );
    assert.equal(boxes[0].offset, 0);
    assert.equal(boxes[1].offset, ftyp.length);
    assert.equal(boxes.at(-1)!.offset + boxes.at(-1)!.size, bytes.length);
  });

  test("reads a 64-bit size and a size of 0, which runs to the end of the file", () => {
    const large = [...u32(1), ...ascii("mdat"), ...u64(16n + 4n), 1, 2, 3, 4];
    const toEnd = [...u32(0), ...ascii("mdat"), 1, 2, 3];
    assert.deepEqual(topLevelBoxes(file(ftyp, large)).map((b) => b.size), [ftyp.length, 20]);
    assert.deepEqual(topLevelBoxes(file(ftyp, toEnd)).map((b) => b.size), [ftyp.length, 11]);
  });

  test("refuses a box that runs past the end of the file", () => {
    const bytes = fastStart();
    assert.throws(() => topLevelBoxes(bytes.subarray(0, bytes.length - 2)), /past the end/);
  });

  test("refuses a box smaller than its own header, rather than looping", () => {
    assert.throws(() => topLevelBoxes(file(ftyp, [...u32(4), ...ascii("free")])), /smaller than its header/);
    assert.throws(() => topLevelBoxes(file(ftyp, [0, 0, 0])), /cut off/);
  });
});

describe("the fast-start check", () => {
  test("passes moov before mdat, and gives the first mdat byte", () => {
    const bytes = fastStart();
    const { firstMediaByte } = checkFastStart(bytes);
    assert.equal(firstMediaByte, ftyp.length + movie().length + free.length + 8);
    assert.equal(bytes[firstMediaByte], 0xff);
  });

  test("refuses mdat before moov, the old site's layout", () => {
    assert.throws(() => checkFastStart(file(ftyp, free, mdat, movie())), /mdat comes before moov/);
  });

  test("refuses a file with no moov or no mdat", () => {
    assert.throws(() => checkFastStart(file(ftyp, mdat)), /no moov/);
    assert.throws(() => checkFastStart(file(ftyp, movie())), /no mdat/);
  });
});

describe("the timestamp zeroing", () => {
  for (const version of [0, 1] as const) {
    test(`zeroes the six times in a version ${version} file and leaves every other byte alone`, () => {
      const bytes = fastStart(version);
      const zeroed = zeroTimestamps(bytes);
      const { offsets, width } = timeOffsets(bytes, version);
      assert.equal(offsets.length, 6);
      const times = new Set(offsets.flatMap((at) => Array.from({ length: width }, (_, i) => at + i)));
      for (let i = 0; i < bytes.length; i++) {
        if (times.has(i)) assert.equal(zeroed[i], 0, `byte ${i} should be zeroed`);
        else assert.equal(zeroed[i], bytes[i], `byte ${i} changed`);
      }
      assert.notEqual(bytes[offsets[0] + width - 1], 0, "the input keeps its times");
    });
  }

  test("makes two encodes that differ only in their times identical", () => {
    const later = fastStart();
    const view = new DataView(later.buffer);
    for (const at of timeOffsets(later, 0).offsets) view.setUint32(at, view.getUint32(at) + 7);
    assert.deepEqual(zeroTimestamps(later), zeroTimestamps(fastStart()));
  });

  test("zeroes every track's times, not just the first", () => {
    const moov = movie();
    const secondTrak = box("trak", fullBox("tkhd", 0, CREATED, MODIFIED, [2]), box("mdia", fullBox("mdhd", 0, CREATED, MODIFIED, [3])));
    const twoTracks = file(ftyp, [...u32(moov.length + secondTrak.length), ...moov.slice(4), ...secondTrak], mdat);
    const zeroed = Buffer.from(zeroTimestamps(twoTracks));
    assert.equal(zeroed.indexOf(Buffer.from(u32(CREATED))), -1);
    assert.equal(zeroed.indexOf(Buffer.from(u32(MODIFIED))), -1);
  });

  test("refuses a file with no mvhd, rather than staging times it didn't find", () => {
    assert.throws(() => zeroTimestamps(file(ftyp, box("moov", box("trak")), mdat)), /mvhd/);
  });

  test("refuses a full box too short for its times", () => {
    const short = file(ftyp, box("moov", box("mvhd", [0, 0, 0, 0], u32(1))), mdat);
    assert.throws(() => zeroTimestamps(short), /mvhd.*too short/);
  });
});
