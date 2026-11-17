import type { Playback } from "./state.ts";

// SPEC-audio-engine.md's mapping table. The words match TrackRow's and
// NowPlayingBar's state props, but audio-engine never imports design-system,
// so they're written out here rather than imported.
export type RowState = "idle" | "loading" | "playing" | "played";
export type BarState = "hidden" | "loading" | "playing" | "ended";

export function rowState(playback: Playback, trackId: string): RowState {
  if (playback?.trackId !== trackId) return "idle";
  return playback.phase === "ended" ? "played" : playback.phase;
}

// A failed snippet shows the ended bar too (open question 4), so the stream
// buttons are still there to hear the full track.
export function barState(playback: Playback): BarState {
  if (!playback || (playback.phase === "ended" && !playback.barOpen)) return "hidden";
  return playback.phase;
}
