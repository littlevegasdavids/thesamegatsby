// The MP4 boxes that matter for a snippet. moov, the index, has to come
// before mdat, the audio, so a browser can start playing from the first few
// kilobytes. And afconvert stamps each encode with the time, so two encodes
// of the same input differ in exactly those fields: zeroing them makes the
// bytes, and so the content hash, the same every time.

export type Box = { type: string; offset: number; size: number; header: number };

// The boxes between start and end. Every size is checked against the bytes
// that are actually there, so a malformed file is refused, never read past.
function boxesIn(bytes: Uint8Array, start: number, end: number): Box[] {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const boxes: Box[] = [];
  for (let at = start; at < end; ) {
    if (at + 8 > end) throw new Error(`the MP4 is cut off inside a box header at byte ${at}`);
    const type = String.fromCharCode(...bytes.subarray(at + 4, at + 8));
    let size = view.getUint32(at);
    let header = 8;
    if (size === 1) {
      if (at + 16 > end) throw new Error(`the MP4 is cut off inside ${type}'s 64-bit size at byte ${at}`);
      size = Number(view.getBigUint64(at + 8));
      header = 16;
    } else if (size === 0) {
      size = end - at; // runs to the end of its parent
    }
    if (size < header) throw new Error(`${type} at byte ${at} is ${size} bytes, smaller than its header`);
    if (at + size > end) throw new Error(`${type} at byte ${at} runs past the end of the file`);
    boxes.push({ type, offset: at, size, header });
    at += size;
  }
  return boxes;
}

export const topLevelBoxes = (bytes: Uint8Array) => boxesIn(bytes, 0, bytes.length);

// moov before mdat, and where the audio starts: the infra spec's range check
// fetches bytes 0–16383, so the first audio has to land inside them.
export function checkFastStart(bytes: Uint8Array): { firstMediaByte: number } {
  const boxes = topLevelBoxes(bytes);
  const moov = boxes.findIndex((b) => b.type === "moov");
  const mdat = boxes.findIndex((b) => b.type === "mdat");
  if (moov === -1) throw new Error("the MP4 has no moov box");
  if (mdat === -1) throw new Error("the MP4 has no mdat box");
  if (mdat < moov) throw new Error("mdat comes before moov, so a browser would have to fetch the whole file before it could play");
  return { firstMediaByte: boxes[mdat].offset + boxes[mdat].header };
}

// The full boxes whose first fields, after version and flags, are a creation
// and a modification time, and the containers they sit in.
const STAMPED = new Set(["mvhd", "tkhd", "mdhd"]);
const CONTAINERS = new Set(["moov", "trak", "mdia"]);

// A copy with every creation and modification time in mvhd, tkhd and mdhd set
// to 0. Nothing else changes.
export function zeroTimestamps(bytes: Uint8Array): Uint8Array {
  const out = bytes.slice();
  const found = new Set<string>();

  const walk = (start: number, end: number) => {
    for (const box of boxesIn(out, start, end)) {
      const body = box.offset + box.header;
      if (CONTAINERS.has(box.type)) {
        walk(body, box.offset + box.size);
      } else if (STAMPED.has(box.type)) {
        const width = out[body] === 1 ? 8 : 4; // version 1 has 64-bit times
        if (body + 4 + 2 * width > box.offset + box.size) throw new Error(`${box.type} at byte ${box.offset} is too short for its times`);
        out.fill(0, body + 4, body + 4 + 2 * width);
        found.add(box.type);
      }
    }
  };
  walk(0, out.length);

  for (const type of STAMPED) {
    if (!found.has(type)) throw new Error(`the MP4 has no ${type}, so its timestamps can't be zeroed`);
  }
  return out;
}
