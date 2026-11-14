import type { Audio } from "./wav.ts";

// Every snippet is matched to one fixed loudness, so tapping from one track
// to the next never needs the volume. It's one gain over the whole cut, never
// compression or limiting, so the mix is left alone (SPEC-media-pipeline.md,
// open question 5). The target is a number rather than the other songs'
// level, so a new song matches the old ones without re-cutting them.
export const TARGET_LUFS = -14;
export const TRUE_PEAK_CEILING = -1;

export type Biquad = { b: [number, number, number]; a: [number, number] };

// ITU-R BS.1770-4's K-weighting, worked out for any sample rate the way
// libebur128 does it, so 44.1 kHz masters aren't measured with the 48 kHz
// coefficients. Stage 1 is a high shelf for the head, stage 2 a high-pass.
export function kWeighting(sampleRate: number): [Biquad, Biquad] {
  let f0 = 1681.974450955533;
  const gainDb = 3.999843853973347;
  let q = 0.7071752369554196;
  let k = Math.tan((Math.PI * f0) / sampleRate);
  const vh = 10 ** (gainDb / 20);
  const vb = vh ** 0.4996667741545416;
  let a0 = 1 + k / q + k * k;
  const shelf: Biquad = {
    b: [(vh + (vb * k) / q + k * k) / a0, (2 * (k * k - vh)) / a0, (vh - (vb * k) / q + k * k) / a0],
    a: [(2 * (k * k - 1)) / a0, (1 - k / q + k * k) / a0],
  };

  f0 = 38.13547087602444;
  q = 0.5003270373238773;
  k = Math.tan((Math.PI * f0) / sampleRate);
  a0 = 1 + k / q + k * k;
  const highPass: Biquad = { b: [1, -2, 1], a: [(2 * (k * k - 1)) / a0, (1 - k / q + k * k) / a0] };
  return [shelf, highPass];
}

function filter(input: Float32Array | Float64Array, { b, a }: Biquad): Float64Array {
  const out = new Float64Array(input.length);
  let z1 = 0;
  let z2 = 0;
  for (let i = 0; i < input.length; i++) {
    const x = input[i];
    const y = b[0] * x + z1;
    z1 = b[1] * x - a[0] * y + z2;
    z2 = b[2] * x - a[1] * y;
    out[i] = y;
  }
  return out;
}

const toLufs = (power: number) => -0.691 + 10 * Math.log10(power);

// Integrated loudness in LUFS: 400 ms blocks every 100 ms, an absolute gate
// at −70 LUFS, then a relative gate 10 LU under what's left. A mono master is
// counted as played through both speakers, so it matches a stereo one.
export function integratedLoudness(audio: Audio): number {
  const { sampleRate, channels } = audio;
  const [shelf, highPass] = kWeighting(sampleRate);
  const weighted = channels.map((channel) => filter(filter(channel, shelf), highPass));
  const weight = channels.length === 1 ? 2 : 1;

  const blockFrames = Math.round(0.4 * sampleRate);
  const step = Math.round(0.1 * sampleRate);
  const frames = channels[0].length;
  if (frames < blockFrames) return -Infinity;

  // Running sums of squares, so each block is two lookups rather than a loop.
  const squares = weighted.map((signal) => {
    const sums = new Float64Array(frames + 1);
    for (let i = 0; i < frames; i++) sums[i + 1] = sums[i] + signal[i] * signal[i];
    return sums;
  });

  const blocks: number[] = [];
  for (let start = 0; start + blockFrames <= frames; start += step) {
    let power = 0;
    for (const sums of squares) power += (weight * (sums[start + blockFrames] - sums[start])) / blockFrames;
    blocks.push(power);
  }

  const mean = (powers: number[]) => powers.reduce((sum, p) => sum + p, 0) / powers.length;
  const aboveAbsolute = blocks.filter((p) => toLufs(p) > -70);
  if (aboveAbsolute.length === 0) return -Infinity;
  const relativeGate = toLufs(mean(aboveAbsolute)) - 10;
  const gated = aboveAbsolute.filter((p) => toLufs(p) > relativeGate);
  return toLufs(mean(gated));
}

// 4× oversampling with a Blackman-windowed sinc, 32 taps per phase, which
// finds the peaks a DAC draws between samples. AAC decoding can overshoot by
// about as much, which is why the ceiling sits 1 dB under full scale.
const TAPS = 16; // either side of the point being interpolated
const PHASES = [0.25, 0.5, 0.75].map((offset) => {
  const kernel = new Float64Array(2 * TAPS);
  for (let k = -TAPS + 1; k <= TAPS; k++) {
    const t = offset - k; // distance from sample n + k to the point n + offset
    const sinc = Math.sin(Math.PI * t) / (Math.PI * t);
    const x = (t + TAPS) / (2 * TAPS); // 0..1 across the window
    const blackman = 0.42 - 0.5 * Math.cos(2 * Math.PI * x) + 0.08 * Math.cos(4 * Math.PI * x);
    kernel[k + TAPS - 1] = sinc * blackman;
  }
  const sum = kernel.reduce((s, v) => s + v, 0);
  return kernel.map((v) => v / sum); // unity gain at DC
});

export function truePeakDbtp(audio: Audio): number {
  let peak = 0;
  for (const channel of audio.channels) {
    const n = channel.length;
    for (let i = 0; i < n; i++) {
      peak = Math.max(peak, Math.abs(channel[i]));
      for (const kernel of PHASES) {
        let y = 0;
        for (let k = -TAPS + 1; k <= TAPS; k++) {
          const j = i + k;
          if (j >= 0 && j < n) y += channel[j] * kernel[k + TAPS - 1];
        }
        peak = Math.max(peak, Math.abs(y));
      }
    }
  }
  return 20 * Math.log10(peak);
}

export type LoudnessMatch = {
  loudness: number; // the cut as measured, LUFS
  truePeak: number; // the cut as measured, dBTP
  gain: number; // dB to apply
  shortfall: number; // LU the result falls under the target because of the ceiling, or 0
  silent: boolean; // nothing above the gate, so no gain
};

export function matchLoudness(cut: Audio): LoudnessMatch {
  const loudness = integratedLoudness(cut);
  const truePeak = truePeakDbtp(cut);
  if (loudness === -Infinity) return { loudness, truePeak, gain: 0, shortfall: 0, silent: true };
  const wanted = TARGET_LUFS - loudness;
  const gain = Math.min(wanted, TRUE_PEAK_CEILING - truePeak);
  return { loudness, truePeak, gain, shortfall: Math.max(0, wanted - gain), silent: false };
}

export function applyGain(audio: Audio, db: number): Audio {
  const factor = 10 ** (db / 20);
  return { sampleRate: audio.sampleRate, channels: audio.channels.map((channel) => channel.map((s) => s * factor)) };
}
