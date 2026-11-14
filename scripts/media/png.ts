import { crc32, deflateSync, inflateSync } from "node:zlib";

// Just enough PNG to flatten a cover's alpha. sips has no flatten, and its
// JavaScript canvas shifts colours (pure 200, 50, 30 came back as 184, 63,
// 43), so the sRGB PNG sips writes is decoded here, composited onto black and
// written back as plain RGB. Writing it here also drops every chunk but the
// pixels, so no EXIF or GPS from the source can reach the covers.

export type Rgba = { width: number; height: number; pixels: Uint8Array }; // 8-bit RGBA, row by row

const SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10];
const CHANNELS: Record<number, number> = { 0: 1, 2: 3, 4: 2, 6: 4 }; // grey, RGB, grey + alpha, RGBA

function chunks(bytes: Uint8Array) {
  const buf = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (!SIGNATURE.every((b, i) => buf[i] === b)) throw new Error("this isn't a PNG file");
  const out: { type: string; data: Buffer }[] = [];
  for (let at = 8; at < buf.length; ) {
    if (at + 12 > buf.length) throw new Error("the PNG is cut off");
    const length = buf.readUInt32BE(at);
    if (at + 12 + length > buf.length) throw new Error("the PNG is cut off inside a chunk");
    out.push({ type: buf.toString("latin1", at + 4, at + 8), data: buf.subarray(at + 8, at + 8 + length) });
    at += 12 + length;
  }
  return out;
}

export function decodePng(bytes: Uint8Array): Rgba {
  const all = chunks(bytes);
  const header = all.find((c) => c.type === "IHDR")?.data;
  if (!header) throw new Error("the PNG has no IHDR");
  const width = header.readUInt32BE(0);
  const height = header.readUInt32BE(4);
  const [depth, colourType, , , interlace] = header.subarray(8, 13);
  const channels = CHANNELS[colourType];
  if (!channels || (depth !== 8 && depth !== 16)) throw new Error(`the PNG is colour type ${colourType} at ${depth} bits: only 8- or 16-bit grey or RGB, with or without alpha, is read`);
  if (interlace !== 0) throw new Error("the PNG is interlaced, which isn't read");

  const bytesPerSample = depth / 8;
  const bpp = channels * bytesPerSample; // bytes per pixel, which the filters step back by
  const stride = width * bpp;
  const raw = inflateSync(Buffer.concat(all.filter((c) => c.type === "IDAT").map((c) => c.data)));
  if (raw.length < (stride + 1) * height) throw new Error("the PNG's image data is cut off");

  const pixels = new Uint8Array(width * height * 4);
  let previous = new Uint8Array(stride);
  for (let y = 0; y < height; y++) {
    const row = new Uint8Array(stride);
    const filterType = raw[y * (stride + 1)];
    for (let i = 0; i < stride; i++) {
      const x = raw[y * (stride + 1) + 1 + i];
      const left = i >= bpp ? row[i - bpp] : 0;
      const up = previous[i];
      const upLeft = i >= bpp ? previous[i - bpp] : 0;
      let predicted = 0;
      if (filterType === 1) predicted = left;
      else if (filterType === 2) predicted = up;
      else if (filterType === 3) predicted = (left + up) >> 1;
      else if (filterType === 4) {
        const p = left + up - upLeft;
        const [pa, pb, pc] = [Math.abs(p - left), Math.abs(p - up), Math.abs(p - upLeft)];
        predicted = pa <= pb && pa <= pc ? left : pb <= pc ? up : upLeft;
      } else if (filterType !== 0) throw new Error(`the PNG uses an unknown filter, ${filterType}, on row ${y}`);
      row[i] = (x + predicted) & 255;
    }
    for (let x = 0; x < width; x++) {
      // 16-bit samples keep their high byte, which is all an 8-bit cover needs.
      const sample = (c: number) => row[x * bpp + c * bytesPerSample];
      const out = (y * width + x) * 4;
      const grey = channels <= 2;
      pixels[out] = sample(0);
      pixels[out + 1] = grey ? sample(0) : sample(1);
      pixels[out + 2] = grey ? sample(0) : sample(2);
      pixels[out + 3] = channels === 4 ? sample(3) : channels === 2 ? sample(1) : 255;
    }
    previous = row;
  }
  return { width, height, pixels };
}

// Composites every pixel onto black, in place, and says how many weren't
// fully opaque, so add-song can report covers whose transparency shows.
export function flattenOntoBlack(image: Rgba): number {
  const { pixels } = image;
  let transparent = 0;
  for (let i = 0; i < pixels.length; i += 4) {
    const alpha = pixels[i + 3];
    if (alpha === 255) continue;
    transparent++;
    for (let c = 0; c < 3; c++) pixels[i + c] = Math.round((pixels[i + c] * alpha) / 255);
    pixels[i + 3] = 255;
  }
  return transparent;
}

// 8-bit RGB, no filters, tagged sRGB, and nothing else.
export function encodeRgbPng(image: Rgba): Uint8Array {
  const { width, height, pixels } = image;
  const raw = Buffer.alloc((width * 3 + 1) * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const from = (y * width + x) * 4;
      const to = y * (width * 3 + 1) + 1 + x * 3;
      raw[to] = pixels[from];
      raw[to + 1] = pixels[from + 1];
      raw[to + 2] = pixels[from + 2];
    }
  }
  const chunk = (type: string, data: Uint8Array) => {
    const body = Buffer.concat([Buffer.from(type, "latin1"), data]);
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body));
    return Buffer.concat([length, body, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 2; // RGB
  return Buffer.concat([
    Buffer.from(SIGNATURE),
    chunk("IHDR", ihdr),
    chunk("sRGB", Uint8Array.of(0)), // perceptual
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", new Uint8Array(0)),
  ]);
}
