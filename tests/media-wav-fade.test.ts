import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { DEFAULT_FADE_IN, DEFAULT_FADE_OUT, applyFades, cut, fadeGain, parseStart, peakDbfs } from "../scripts/media/fade.ts";
import { readWav, writeWav } from "../scripts/media/wav.ts";
import type { Audio } from "../scripts/media/wav.ts";

// A sine of the given length, with each channel at its own frequency so a
// swapped or interleaving bug shows.
function tone(seconds: number, sampleRate: number, channelCount = 2): Audio {
  const frames = Math.round(seconds * sampleRate);
  const channels = Array.from({ length: channelCount }, (_, c) => {
    const data = new Float32Array(frames);
    for (let i = 0; i < frames; i++) data[i] = 0.5 * Math.sin((2 * Math.PI * (440 + 110 * c) * i) / sampleRate);
    return data;
  });
  return { sampleRate, channels };
}

const constant = (seconds: number, sampleRate: number, value = 1): Audio => ({
  sampleRate,
  channels: [new Float32Array(Math.round(seconds * sampleRate)).fill(value), new Float32Array(Math.round(seconds * sampleRate)).fill(value)],
});

// The layout afconvert -f WAVE -d LEF32 writes: WAVE_FORMAT_EXTENSIBLE with
// the IEEE float subformat, and a FLLR padding chunk before data.
function appleWav(audio: Audio): Uint8Array {
  const { sampleRate, channels } = audio;
  const frames = channels[0].length;
  const dataBytes = frames * channels.length * 4;
  const fllr = 12;
  const out = new DataView(new ArrayBuffer(12 + 8 + 40 + 8 + fllr + 8 + dataBytes));
  const ascii = (at: number, s: string) => [...s].forEach((ch, i) => out.setUint8(at + i, ch.charCodeAt(0)));
  ascii(0, "RIFF");
  out.setUint32(4, out.byteLength - 8, true);
  ascii(8, "WAVE");
  ascii(12, "fmt ");
  out.setUint32(16, 40, true);
  out.setUint16(20, 0xfffe, true);
  out.setUint16(22, channels.length, true);
  out.setUint32(24, sampleRate, true);
  out.setUint32(28, sampleRate * channels.length * 4, true);
  out.setUint16(32, channels.length * 4, true);
  out.setUint16(34, 32, true);
  out.setUint16(36, 22, true); // cbSize
  out.setUint16(38, 32, true); // valid bits
  out.setUint32(40, 3, true); // channel mask
  // KSDATAFORMAT_SUBTYPE_IEEE_FLOAT: 00000003-0000-0010-8000-00aa00389b71
  [0x03, 0, 0, 0, 0, 0, 0x10, 0, 0x80, 0, 0, 0xaa, 0, 0x38, 0x9b, 0x71].forEach((b, i) => out.setUint8(44 + i, b));
  ascii(60, "FLLR");
  out.setUint32(64, fllr, true);
  ascii(68 + fllr, "data");
  out.setUint32(72 + fllr, dataBytes, true);
  let at = 76 + fllr;
  for (let i = 0; i < frames; i++) {
    for (const channel of channels) {
      out.setFloat32(at, channel[i], true);
      at += 4;
    }
  }
  return new Uint8Array(out.buffer);
}

const sameBits = (a: Float32Array, b: Float32Array) =>
  a.length === b.length && Buffer.from(a.buffer, a.byteOffset, a.byteLength).equals(Buffer.from(b.buffer, b.byteOffset, b.byteLength));

describe("WAV", () => {
  test("a write then read round trip is lossless, in stereo and mono", () => {
    for (const audio of [tone(1, 48_000), tone(0.5, 44_100, 1)]) {
      const back = readWav(writeWav(audio));
      assert.equal(back.sampleRate, audio.sampleRate);
      assert.equal(back.channels.length, audio.channels.length);
      audio.channels.forEach((channel, c) => assert.ok(sameBits(back.channels[c], channel), `channel ${c} changed`));
    }
  });

  test("keeps values a float can hold that a 16-bit file couldn't", () => {
    const audio: Audio = { sampleRate: 48_000, channels: [Float32Array.of(1.5, -2, 1e-9, -0)] };
    assert.ok(sameBits(readWav(writeWav(audio)).channels[0], audio.channels[0]));
  });

  test("reads the extensible layout afconvert writes, skipping its FLLR chunk", () => {
    const audio = tone(0.25, 44_100);
    const back = readWav(appleWav(audio));
    assert.equal(back.sampleRate, 44_100);
    audio.channels.forEach((channel, c) => assert.ok(sameBits(back.channels[c], channel)));
  });

  test("refuses anything but 32-bit float, mono or stereo", () => {
    const pcm16 = writeWav(tone(0.01, 48_000));
    new DataView(pcm16.buffer).setUint16(20, 1, true);
    assert.throws(() => readWav(pcm16), /32-bit float/);

    const surround: Audio = { sampleRate: 48_000, channels: [0, 1, 2].map(() => new Float32Array(4)) };
    assert.throws(() => writeWav(surround), /mono or stereo/);
    assert.throws(() => readWav(appleWav(surround)), /mono or stereo/);

    assert.throws(() => readWav(new TextEncoder().encode("ID3 not a wav file")), /WAV/);
  });

  test("refuses a file cut off inside its data", () => {
    const wav = writeWav(tone(0.1, 48_000));
    assert.throws(() => readWav(wav.subarray(0, wav.length - 100)), /cut off|truncated/);
  });
});

describe("the cut", () => {
  test("is exactly 30 s of frames at 44.1 and 48 kHz", () => {
    for (const rate of [44_100, 48_000]) {
      const snippet = cut(tone(40, rate), 7.25);
      assert.equal(snippet.sampleRate, rate);
      for (const channel of snippet.channels) assert.equal(channel.length, 30 * rate);
    }
  });

  test("starts at the start second's frame", () => {
    const rate = 48_000;
    const master = tone(40, rate);
    const snippet = cut(master, 2.5);
    master.channels.forEach((channel, c) => assert.ok(sameBits(snippet.channels[c], channel.subarray(2.5 * rate, 32.5 * rate))));
  });

  test("copies, so fading the snippet leaves the master alone", () => {
    const master = constant(31, 48_000);
    applyFades(cut(master, 0));
    assert.equal(master.channels[0][0], 1);
  });

  test("allows a cut that ends on the master's last frame", () => {
    assert.doesNotThrow(() => cut(tone(40, 48_000), 10));
  });

  test("refuses a master shorter than start + 30 s, with the shortfall", () => {
    assert.throws(() => cut(tone(40, 48_000), 12.5), /2\.50 s short/);
    assert.throws(() => cut(tone(20, 44_100), 0), /10\.00 s short/);
    assert.throws(() => cut(tone(40, 48_000), -1), /start/);
  });
});

describe("the fades", () => {
  test("default to 0.15 s in and 2 s out", () => {
    assert.equal(DEFAULT_FADE_IN, 0.15);
    assert.equal(DEFAULT_FADE_OUT, 2);
  });

  test("are 0 at the first and last sample and 1 between", () => {
    const rate = 48_000;
    const faded = applyFades(constant(30, rate));
    const left = faded.channels[0];
    assert.equal(left[0], 0);
    assert.equal(left[left.length - 1], 0);
    assert.equal(left[0.15 * rate], 1);
    assert.equal(left[15 * rate], 1);
    assert.equal(left[left.length - 1 - 2 * rate], 1);
  });

  test("follow the raised cosine, 0.5 at their half-way points", () => {
    const rate = 48_000;
    const left = applyFades(constant(30, rate)).channels[0];
    const n = left.length;
    assert.ok(Math.abs(left[Math.round(0.075 * rate)] - 0.5) < 1e-6);
    assert.ok(Math.abs(left[n - 1 - 1 * rate] - 0.5) < 1e-6);
    // A quarter of the way into the fade-in: 0.5 − 0.5·cos(π/4).
    assert.ok(Math.abs(left[Math.round(0.0375 * rate)] - (0.5 - 0.5 * Math.cos(Math.PI / 4))) < 1e-6);
  });

  test("rise and fall smoothly, never overshooting", () => {
    const n = 30 * 44_100;
    const fadeIn = Math.round(0.15 * 44_100);
    let previous = -1;
    for (let i = 0; i <= fadeIn; i++) {
      const g = fadeGain(i, n, fadeIn, 2 * 44_100);
      assert.ok(g >= previous && g <= 1);
      previous = g;
    }
  });

  test("take per-song overrides, including none at all", () => {
    const rate = 44_100;
    const left = applyFades(constant(30, rate), { fadeIn: 1, fadeOut: 0.5 }).channels[0];
    assert.ok(Math.abs(left[Math.round(0.5 * rate)] - 0.5) < 1e-6);
    assert.ok(Math.abs(left[left.length - 1 - Math.round(0.25 * rate)] - 0.5) < 1e-6);
    const none = applyFades(constant(30, rate), { fadeIn: 0, fadeOut: 0 }).channels[0];
    assert.equal(none[0], 1);
    assert.equal(none[none.length - 1], 1);
  });

  test("apply the same gain to every channel", () => {
    const faded = applyFades(constant(30, 48_000));
    assert.ok(sameBits(faded.channels[0], faded.channels[1]));
  });

  test("refuse fades that are negative or longer than the snippet together", () => {
    assert.throws(() => applyFades(constant(30, 48_000), { fadeIn: -0.1, fadeOut: 2 }), /fade/);
    assert.throws(() => applyFades(constant(30, 48_000), { fadeIn: 20, fadeOut: 15 }), /fade/);
  });
});

describe("--start", () => {
  test("takes seconds or m:ss.s", () => {
    assert.equal(parseStart("62.5"), 62.5);
    assert.equal(parseStart("41"), 41);
    assert.equal(parseStart("1:02.5"), 62.5);
    assert.equal(parseStart("0:41"), 41);
    assert.equal(parseStart("12:00"), 720);
  });

  test("refuses anything else", () => {
    for (const bad of ["", "abc", "-3", "1:2", "1:60", "1:02:03", "1.2.3", " 41"]) {
      assert.throws(() => parseStart(bad), /--start/, bad);
    }
  });
});

describe("peak level", () => {
  test("comes out in dBFS", () => {
    assert.ok(Math.abs(peakDbfs(tone(1, 48_000)) - 20 * Math.log10(0.5)) < 0.01);
    assert.equal(peakDbfs(constant(0.1, 48_000, 1)), 0);
    assert.ok(Math.abs(peakDbfs(constant(0.1, 48_000, -2)) - 20 * Math.log10(2)) < 1e-9);
  });

  test("is −Infinity for silence", () => {
    assert.equal(peakDbfs(constant(0.1, 48_000, 0)), -Infinity);
  });
});
