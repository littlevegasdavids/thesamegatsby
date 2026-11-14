// 32-bit float WAV, mono or stereo: the one format the Node side reads.
// afconvert turns every master into it first (-f WAVE -d LEF32), so the cut,
// the loudness match and the fades never see 16- or 24-bit PCM.

// Planar: one Float32Array per channel, all the same length.
export type Audio = { sampleRate: number; channels: Float32Array[] };

const FORMAT_FLOAT = 3;
const FORMAT_EXTENSIBLE = 0xfffe;
// The rest of KSDATAFORMAT_SUBTYPE_IEEE_FLOAT after its first two bytes,
// which carry the format code: 0003 0000-0010-8000-00aa00389b71.
const FLOAT_GUID_TAIL = [0, 0, 0, 0, 0x10, 0, 0x80, 0, 0, 0xaa, 0, 0x38, 0x9b, 0x71];

const fourCC = (view: DataView, at: number) =>
  String.fromCharCode(view.getUint8(at), view.getUint8(at + 1), view.getUint8(at + 2), view.getUint8(at + 3));

function checkChannels(count: number) {
  if (count !== 1 && count !== 2) throw new Error(`the audio has ${count} channels: it must be mono or stereo`);
}

export function readWav(bytes: Uint8Array): Audio {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (bytes.length < 12 || fourCC(view, 0) !== "RIFF" || fourCC(view, 8) !== "WAVE") {
    throw new Error("this isn't a WAV file");
  }

  let format: { channels: number; sampleRate: number } | undefined;
  // Chunks are walked to the end of the file rather than trusting the RIFF
  // size, and anything but fmt and data (FLLR, fact, LIST) is skipped.
  for (let at = 12; at + 8 <= bytes.length; ) {
    const id = fourCC(view, at);
    const size = view.getUint32(at + 4, true);
    const body = at + 8;

    if (id === "fmt ") {
      if (size < 16 || body + size > bytes.length) throw new Error("the WAV's fmt chunk is cut off");
      let tag = view.getUint16(body, true);
      const channels = view.getUint16(body + 2, true);
      const sampleRate = view.getUint32(body + 4, true);
      const bits = view.getUint16(body + 14, true);
      if (tag === FORMAT_EXTENSIBLE && size >= 40) {
        const guidTail = FLOAT_GUID_TAIL.every((b, i) => view.getUint8(body + 26 + i) === b);
        tag = guidTail ? view.getUint16(body + 24, true) : -1;
      }
      if (tag !== FORMAT_FLOAT || bits !== 32) throw new Error("the WAV must be 32-bit float: convert it with afconvert -d LEF32 first");
      checkChannels(channels);
      format = { channels, sampleRate };
    } else if (id === "data") {
      if (!format) throw new Error("the WAV's data comes before its fmt chunk");
      if (body + size > bytes.length) throw new Error("the WAV is cut off inside its data");
      const frames = Math.floor(size / (4 * format.channels));
      const channels = Array.from({ length: format.channels }, () => new Float32Array(frames));
      let p = body;
      for (let i = 0; i < frames; i++) {
        for (const channel of channels) {
          channel[i] = view.getFloat32(p, true);
          p += 4;
        }
      }
      return { sampleRate: format.sampleRate, channels };
    }
    at = body + size + (size & 1); // chunks are padded to an even length
  }
  throw new Error(format ? "the WAV has no data chunk" : "the WAV has no fmt chunk");
}

export function writeWav(audio: Audio): Uint8Array {
  const { sampleRate, channels } = audio;
  checkChannels(channels.length);
  const frames = channels[0].length;
  if (channels.some((c) => c.length !== frames)) throw new Error("every channel must have the same length");

  const dataBytes = frames * channels.length * 4;
  // RIFF header, an 18-byte fmt (float needs cbSize), fact, then data.
  const bytes = new Uint8Array(12 + 26 + 12 + 8 + dataBytes);
  const view = new DataView(bytes.buffer);
  const ascii = (at: number, s: string) => [...s].forEach((ch, i) => view.setUint8(at + i, ch.charCodeAt(0)));

  ascii(0, "RIFF");
  view.setUint32(4, bytes.length - 8, true);
  ascii(8, "WAVE");
  ascii(12, "fmt ");
  view.setUint32(16, 18, true);
  view.setUint16(20, FORMAT_FLOAT, true);
  view.setUint16(22, channels.length, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * channels.length * 4, true);
  view.setUint16(32, channels.length * 4, true);
  view.setUint16(34, 32, true);
  view.setUint16(36, 0, true);
  ascii(38, "fact");
  view.setUint32(42, 4, true);
  view.setUint32(46, frames, true);
  ascii(50, "data");
  view.setUint32(54, dataBytes, true);

  let p = 58;
  for (let i = 0; i < frames; i++) {
    for (const channel of channels) {
      view.setFloat32(p, channel[i], true);
      p += 4;
    }
  }
  return bytes;
}
