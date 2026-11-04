import { formatLength, formatTime } from "../../format.ts";

// TrackRow's states, kept out of the .tsx so tests/track-row.test.ts can
// check them. A row is lit once it has been tapped, and stays lit after its
// snippet ends, as Main.dc.html draws it. It's pressed only while it runs
// (loading or playing), so a tap then stops it.
export const TRACK_ROW_STATES = ["idle", "loading", "playing", "played"] as const;

export type TrackRowState = (typeof TRACK_ROW_STATES)[number];

export type TrackRowVariant = "nested" | "list";

export function trackRowLook(state: TrackRowState): { lit: boolean; running: boolean } {
  return { lit: state !== "idle", running: state === "loading" || state === "playing" };
}

export function trackRowLabel(title: string, state: TrackRowState): string {
  return `${trackRowLook(state).running ? "Stop" : "Play"} ${title} snippet`;
}

export function trackNumber(index: number): string {
  return String(index).padStart(2, "0");
}

// The time column: the length idle, the count while playing, "END" once
// played. Loading has no time yet, so the row draws the load glyph instead.
export function trackRowTime(state: TrackRowState, elapsed: number, duration: number): string | null {
  switch (state) {
    case "idle":
      return formatLength(duration);
    case "playing":
      return formatTime(elapsed);
    case "played":
      return "END";
    case "loading":
      return null;
  }
}
