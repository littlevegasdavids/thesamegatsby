import { SNIPPET_LENGTH } from "../../src/catalogue/validate.ts";
import type { Audio } from "./wav.ts";

// The fades are baked into the samples (SPEC.md): iPhones ignore volume set
// by the page, and a fade in the file needs no code at play time. Both are 2 s,
// so a snippet eases in and out rather than starting on a cut. Reno chose the
// fade-in at Checkpoint 10 after hearing 0.15 s (SPEC-media-pipeline.md, open
// question 1). --fade-in and --fade-out override them per song.
export const DEFAULT_FADE_IN = 2;
export const DEFAULT_FADE_OUT = 2;

// [start, start + 30 s) as copies, so later steps can't touch the master.
export function cut(master: Audio, start: number, seconds = SNIPPET_LENGTH): Audio {
  const { sampleRate, channels } = master;
  if (!Number.isFinite(start) || start < 0) throw new Error(`--start must be 0 or more, not ${start}`);
  const from = Math.round(start * sampleRate);
  const frames = Math.round(seconds * sampleRate);
  const length = channels[0].length;
  if (from + frames > length) {
    const short = (from + frames - length) / sampleRate;
    throw new Error(
      `the master is ${(length / sampleRate).toFixed(2)} s, and a ${seconds} s cut from ${start} s needs ` +
        `${((from + frames) / sampleRate).toFixed(2)} s: it's ${short.toFixed(2)} s short. ` +
        (frames > length ? `The whole master is shorter than ${seconds} s` : "Use an earlier --start"),
    );
  }
  return { sampleRate, channels: channels.map((channel) => channel.slice(from, from + frames)) };
}

// Raised cosine: 0 on the first and last sample, 1 between the fades, and
// 0.5 half-way through each. fadeIn and fadeOut are lengths in frames.
export function fadeGain(i: number, frames: number, fadeIn: number, fadeOut: number): number {
  const ramp = (position: number, length: number) =>
    length === 0 || position >= length ? 1 : 0.5 - 0.5 * Math.cos((Math.PI * position) / length);
  return ramp(i, fadeIn) * ramp(frames - 1 - i, fadeOut);
}

export function applyFades(
  snippet: Audio,
  { fadeIn = DEFAULT_FADE_IN, fadeOut = DEFAULT_FADE_OUT }: { fadeIn?: number; fadeOut?: number } = {},
): Audio {
  const { sampleRate, channels } = snippet;
  const frames = channels[0].length;
  if (!(fadeIn >= 0 && fadeOut >= 0)) throw new Error("a fade can't be negative");
  const inFrames = Math.round(fadeIn * sampleRate);
  const outFrames = Math.round(fadeOut * sampleRate);
  if (inFrames + outFrames > frames) {
    throw new Error(`the fades (${fadeIn} s in, ${fadeOut} s out) are longer than the ${frames / sampleRate} s snippet`);
  }
  const faded = channels.map((channel) => channel.slice());
  for (const i of [...range(0, inFrames), ...range(frames - outFrames, frames)]) {
    const gain = fadeGain(i, frames, inFrames, outFrames);
    for (const channel of faded) channel[i] *= gain;
  }
  return { sampleRate, channels: faded };
}

function* range(from: number, to: number) {
  for (let i = from; i < to; i++) yield i;
}

// --start takes seconds (62.5) or m:ss.s (1:02.5).
export function parseStart(value: string): number {
  const seconds = /^\d+(?:\.\d+)?$/.exec(value);
  if (seconds) return Number(value);
  const clock = /^(\d+):([0-5]\d(?:\.\d+)?)$/.exec(value);
  if (clock) return Number(clock[1]) * 60 + Number(clock[2]);
  throw new Error(`--start "${value}" must be seconds, like 62.5, or m:ss.s, like 1:02.5`);
}

// The highest sample on any channel, in dBFS: 0 is full scale, and silence
// is −Infinity.
export function peakDbfs(audio: Audio): number {
  let peak = 0;
  for (const channel of audio.channels) for (const sample of channel) peak = Math.max(peak, Math.abs(sample));
  return 20 * Math.log10(peak);
}
