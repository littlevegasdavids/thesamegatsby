import { formatTime } from "../../format.ts";

// The readout's four modes, kept out of the .tsx so tests/vhs-readout.test.ts
// can check them. Each mode has its word and one of the spec's glyphs. Only
// play is lit: the lamp comes on when the tape runs.
export type ReadoutMode = "load" | "play" | "stop" | "ended";

type Glyph = "▶" | "■" | "◌";

export const READOUT_MODES: Record<ReadoutMode, { word: string; glyph: Glyph; lit: boolean }> = {
  load: { word: "LOAD", glyph: "◌", lit: false },
  play: { word: "PLAY", glyph: "▶", lit: true },
  stop: { word: "STOP", glyph: "■", lit: false },
  ended: { word: "END", glyph: "■", lit: false },
};

// VT323 has none of ▶ ■ ◌, so each is drawn, on a 24-unit box at the size
// the bar boards draw them, and painted in currentColor. Play and the square
// are the boards' own paths. The boards never show load, so its dotted
// circle is eight dots on a ring that meets the square's sides.
export const READOUT_GLYPH_VIEWBOX = "0 0 24 24";
export const READOUT_GLYPH_SIZE = 11;

export const READOUT_GLYPH_PATHS: Record<Glyph, string> = {
  "▶": "M5 3v18l16-9z",
  "■": "M4 4h16v16H4z",
  "◌":
    "M18.25 12a1.75 1.75 0 1 0 3.5 0a1.75 1.75 0 1 0-3.5 0zM15.91 17.66a1.75 1.75 0 1 0 3.5 0a1.75 1.75 0 1 0-3.5 0zM10.25 20a1.75 1.75 0 1 0 3.5 0a1.75 1.75 0 1 0-3.5 0zM4.59 17.66a1.75 1.75 0 1 0 3.5 0a1.75 1.75 0 1 0-3.5 0zM2.25 12a1.75 1.75 0 1 0 3.5 0a1.75 1.75 0 1 0-3.5 0zM4.59 6.34a1.75 1.75 0 1 0 3.5 0a1.75 1.75 0 1 0-3.5 0zM10.25 4a1.75 1.75 0 1 0 3.5 0a1.75 1.75 0 1 0-3.5 0zM15.91 6.34a1.75 1.75 0 1 0 3.5 0a1.75 1.75 0 1 0-3.5 0z",
};

// What the readout says, and so what a screen reader reads. It's written in
// capitals rather than set with text-transform, so every browser exposes the
// same text it shows.
export function readoutText(mode: ReadoutMode, elapsed: number, duration: number): string {
  return `${READOUT_MODES[mode].word} ${formatTime(elapsed)} / ${formatTime(duration)}`;
}
