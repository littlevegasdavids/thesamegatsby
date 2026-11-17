export type Phase = "loading" | "playing" | "ended";

// null until the first tap. trackId stays set after Close, so its row keeps
// the played look, as TrackRow's spec draws it.
export type Playback = {
  trackId: string;
  phase: Phase;
  elapsed: number;
  duration: number;
  barOpen: boolean;
  failed: boolean;
} | null;

// duration comes from the catalogue, since the element reads NaN until its
// metadata arrives. "interrupted" is a pause the engine didn't ask for: a
// call, another app's audio, or the lock screen.
export type EngineEvent =
  | { type: "play"; trackId: string; duration: number }
  | { type: "playing" }
  | { type: "waiting" }
  | { type: "timeupdate"; time: number }
  | { type: "ended" }
  | { type: "interrupted" }
  | { type: "error" }
  | { type: "timeout" }
  | { type: "stop" }
  | { type: "replay" }
  | { type: "close" };

const held = (time: number, duration: number) => (Number.isNaN(time) ? 0 : Math.min(Math.max(time, 0), duration));

// An event that doesn't apply returns the same object, so a subscriber sees
// no change and React doesn't re-render.
export function next(state: Playback, event: EngineEvent): Playback {
  if (event.type === "play") {
    return { trackId: event.trackId, phase: "loading", elapsed: 0, duration: event.duration, barOpen: true, failed: false };
  }
  if (!state) return state;

  switch (event.type) {
    case "playing":
      return state.phase === "loading" ? { ...state, phase: "playing" } : state;
    case "waiting":
      return state.phase === "playing" ? { ...state, phase: "loading" } : state;
    case "timeupdate": {
      if (state.phase !== "playing") return state;
      const elapsed = held(event.time, state.duration);
      return elapsed === state.elapsed ? state : { ...state, elapsed };
    }
    case "ended":
      return state.phase === "playing" ? { ...state, phase: "ended", elapsed: state.duration } : state;
    case "interrupted":
      return state.phase === "playing" ? { ...state, phase: "ended" } : state;
    case "error":
      return state.phase === "ended" ? state : { ...state, phase: "ended", failed: true };
    case "timeout":
      return state.phase === "loading" ? { ...state, phase: "ended", failed: true } : state;
    case "stop":
      // Cancelling before any sound leaves nothing to show as played.
      if (state.phase === "loading") return null;
      return state.phase === "playing" ? { ...state, phase: "ended" } : state;
    case "replay":
      return state.phase === "ended" ? { ...state, phase: "loading", elapsed: 0, barOpen: true, failed: false } : state;
    case "close":
      return state.phase === "ended" && state.barOpen ? { ...state, barOpen: false } : state;
  }
}
