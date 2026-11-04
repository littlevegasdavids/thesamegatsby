// How much of the tape is filled: the share of the snippet played, from 0 to
// 1. Kept out of the .tsx so tests/progress-tape.test.ts can check it.
// Anything past the ends is held to them, so the fill never leaves its track.
// NaN, which elapsed / duration gives before the audio knows its length,
// reads as blank tape: as --progress it would make scaleX() invalid, and the
// fill would show the whole track.
export function tapeProgress(ratio: number): number {
  if (Number.isNaN(ratio)) return 0;
  return Math.min(1, Math.max(0, ratio));
}
