import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, describe, test } from "node:test";
import { promisify } from "node:util";
import { DEFAULT_FADE_IN, DEFAULT_FADE_OUT } from "../scripts/media/fade.ts";
import { integratedLoudness, truePeakDbtp } from "../scripts/media/loudness.ts";
import { buildSnippet } from "../scripts/media/snippet.ts";
import type { BuiltSnippet } from "../scripts/media/snippet.ts";
import { readWav, writeWav } from "../scripts/media/wav.ts";
import type { Audio } from "../scripts/media/wav.ts";

// The real afconvert and afinfo, so this only runs on a Mac. Workers Builds
// runs on Linux and skips it.
const skip = process.platform !== "darwin" && "needs afconvert and afinfo, which only macOS has";
const run = promisify(execFile);

// 40 s of two tones over a noise bed, written as a 24-bit PCM master like a
// real export. The bed is what makes the encoder spend bits as it does on
// music: a pure tone gets about 120 kbps, and flat white noise about 171,
// either side of the 150–170 target, so the bed is low-passed to fall off
// with frequency the way music does.
function master(sampleRate: number): Audio {
  const frames = 40 * sampleRate;
  let seed = 1;
  const noise = () => ((seed = (Math.imul(seed, 1103515245) + 12345) >>> 0) / 2 ** 32) * 2 - 1;
  const channels = [0, 1].map((c) => {
    const data = new Float32Array(frames);
    let bed = 0;
    for (let i = 0; i < frames; i++) {
      bed = 0.9 * bed + 0.1 * noise(); // one-pole low-pass: falls off with frequency, as music does
      data[i] = 0.3 * Math.sin((2 * Math.PI * (440 + 220 * c) * i) / sampleRate) + 0.3 * bed;
    }
    return data;
  });
  return { sampleRate, channels };
}

async function writeMaster(dir: string, name: string, sampleRate: number) {
  const float = join(dir, `${name}.f32.wav`);
  const pcm = join(dir, `${name}.wav`);
  await writeFile(float, writeWav(master(sampleRate)));
  await run("afconvert", ["-f", "WAVE", "-d", "LEI24", float, pcm]);
  return pcm;
}

async function decode(dir: string, snippet: BuiltSnippet): Promise<Audio> {
  const m4a = join(dir, "check.m4a");
  const wav = join(dir, "check.wav");
  await writeFile(m4a, snippet.bytes);
  await run("afconvert", ["-f", "WAVE", "-d", "LEF32", m4a, wav]);
  return readWav(await readFile(wav));
}

const peakDb = (audio: Audio, from: number, to: number) => {
  let peak = 0;
  for (const channel of audio.channels) for (let i = from; i < to; i++) peak = Math.max(peak, Math.abs(channel[i]));
  return 20 * Math.log10(peak);
};

const rmsDb = (audio: Audio, centre: number, half: number) => {
  let sum = 0;
  let count = 0;
  for (const channel of audio.channels) {
    for (let i = centre - half; i < centre + half; i++, count++) sum += channel[i] * channel[i];
  }
  return 10 * Math.log10(sum / count);
};

describe("the snippet encode", { skip }, () => {
  let dir: string;
  let first: BuiltSnippet;
  let second: BuiltSnippet;
  let decoded: Audio;

  before(async () => {
    dir = await mkdtemp(join(tmpdir(), "snippet-"));
    const wav = await writeMaster(dir, "tone", 44_100);
    first = await buildSnippet({ master: wav, trackId: "test-tone", start: 5, workDir: join(dir, "one") });
    second = await buildSnippet({ master: wav, trackId: "test-tone", start: 5, workDir: join(dir, "two") });
    decoded = await decode(dir, first);
    console.log(
      `snippet: ${first.info.codec} ${first.info.bitRate} bps, ${first.info.duration} s, ${first.bytes.length} bytes, ` +
        `first audio at byte ${first.firstMediaByte}, cut ${first.loudness.loudness.toFixed(2)} LUFS, gain ${first.loudness.gain.toFixed(2)} dB, ` +
        `decoded ${integratedLoudness(decoded).toFixed(2)} LUFS, ${truePeakDbtp(decoded).toFixed(2)} dBTP`,
    );
  });

  after(() => rm(dir, { recursive: true, force: true }));

  test("is AAC-LC at 150–170 kbps, 30 s ± 0.05", () => {
    assert.equal(first.info.codec, "aac"); // LC; HE-AAC would be aach
    assert.ok(first.info.bitRate >= 150_000 && first.info.bitRate <= 170_000, `${first.info.bitRate} bps`);
    assert.ok(Math.abs(first.info.duration - 30) <= 0.05, `${first.info.duration} s`);
    assert.equal(first.info.sampleRate, 44_100);
  });

  test("puts moov first, with the audio inside the first 16 KB", () => {
    assert.ok(first.firstMediaByte < 16_384, `first audio at byte ${first.firstMediaByte}`);
  });

  test("starts and ends in silence, with each fade its set length", () => {
    const rate = decoded.sampleRate;
    const frames = decoded.channels[0].length;
    const ms = Math.round(rate / 1000);
    assert.ok(peakDb(decoded, 0, ms) < -60, `first 1 ms at ${peakDb(decoded, 0, ms).toFixed(1)} dBFS`);
    assert.ok(peakDb(decoded, frames - ms, frames) < -60, `last 1 ms at ${peakDb(decoded, frames - ms, frames).toFixed(1)} dBFS`);

    // Half-way through a raised-cosine fade the gain is 0.5, 6 dB down.
    const body = rmsDb(decoded, frames / 2, 5 * ms);
    const fadeIn = rmsDb(decoded, Math.round((DEFAULT_FADE_IN / 2) * rate), 2 * ms) - body;
    const fadeOut = rmsDb(decoded, frames - 1 - Math.round((DEFAULT_FADE_OUT / 2) * rate), 5 * ms) - body;
    assert.ok(Math.abs(fadeIn + 6) <= 1, `fade-in half-way at ${fadeIn.toFixed(2)} dB`);
    assert.ok(Math.abs(fadeOut + 6) <= 1, `fade-out half-way at ${fadeOut.toFixed(2)} dB`);
  });

  test("decodes at −14 ± 0.5 LUFS with its true peak at or below −0.5 dBTP", () => {
    const loudness = integratedLoudness(decoded);
    assert.ok(Math.abs(loudness + 14) <= 0.5, `${loudness.toFixed(2)} LUFS`);
    assert.ok(truePeakDbtp(decoded) <= -0.5);
    assert.equal(first.loudness.shortfall, 0);
  });

  test("gives byte-identical files and the same key on a second run", () => {
    assert.deepEqual(second.bytes, first.bytes);
    assert.equal(second.key, first.key);
    assert.match(first.key, /^snippets\/test-tone\.[0-9a-f]{8}\.m4a$/);
  });
});

describe("a master at an unusual rate", { skip }, () => {
  test("is resampled to 48 kHz, while 44.1 and 48 kHz are kept", async () => {
    const dir = await mkdtemp(join(tmpdir(), "snippet-rate-"));
    try {
      const wav = await writeMaster(dir, "hi-res", 96_000);
      const snippet = await buildSnippet({ master: wav, trackId: "hi-res", start: 0, workDir: dir });
      assert.equal(snippet.info.sampleRate, 48_000);
      assert.ok(Math.abs(snippet.info.duration - 30) <= 0.05, `${snippet.info.duration} s`);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});

describe("a master too short for the cut", { skip }, () => {
  test("is refused before anything is encoded", async () => {
    const dir = await mkdtemp(join(tmpdir(), "snippet-short-"));
    try {
      const wav = await writeMaster(dir, "short", 48_000);
      await assert.rejects(buildSnippet({ master: wav, trackId: "short", start: 15, workDir: dir }), /5\.00 s short/);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
