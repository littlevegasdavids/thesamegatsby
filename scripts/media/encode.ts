import { execFile } from "node:child_process";
import { promisify } from "node:util";

// Thin wrappers over the macOS audio tools. Every call passes an argument
// array, never a shell string, so a title or path with quotes or spaces
// can't break out (SPEC-media-pipeline.md).
const run = promisify(execFile);

// The rates a master keeps. Anything else is resampled to 48 kHz.
export const KEPT_RATES = [44_100, 48_000];

// Any master Core Audio reads (WAV, AIFF, FLAC, 1 or 2 channels) to 32-bit
// float WAV, the one format the Node side reads. With a rate, it resamples
// at the best converter quality.
export async function decodeToFloatWav(input: string, output: string, sampleRate?: number): Promise<void> {
  const format = sampleRate ? `LEF32@${sampleRate}` : "LEF32";
  await run("afconvert", ["-f", "WAVE", "-d", format, ...(sampleRate ? ["-r", "127"] : []), input, output]);
}

// Apple's AAC encoder at about 160 kbps, constrained VBR, best quality. It
// writes moov before mdat, so no faststart pass is needed.
export async function encodeAac(wav: string, output: string): Promise<void> {
  await run("afconvert", ["-f", "m4af", "-d", "aac", "-b", "160000", "-s", "2", "-q", "127", wav, output]);
}

export type AudioInfo = { codec: string; channels: number; sampleRate: number; duration: number; bitRate: number };

// What afinfo reports. Its duration allows for the encoder's priming frames,
// so it's the length a listener hears.
export async function audioInfo(file: string): Promise<AudioInfo> {
  const { stdout } = await run("afinfo", [file]);
  const format = /Data format:\s+(\d+) ch,\s+(\d+) Hz,\s+(\S+)/.exec(stdout);
  const duration = /estimated duration:\s+([\d.]+)/.exec(stdout);
  const bitRate = /bit rate:\s+(\d+)/.exec(stdout);
  if (!format || !duration || !bitRate) throw new Error(`afinfo didn't describe ${file}`);
  return {
    channels: Number(format[1]),
    sampleRate: Number(format[2]),
    codec: format[3].replace(/,$/, ""),
    duration: Number(duration[1]),
    bitRate: Number(bitRate[1]),
  };
}
