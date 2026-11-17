import type { Playback } from "./state.ts";
import type { Artwork, EngineTrack } from "./tracks.ts";

export const ARTIST = "Déjà Gatsby";

// A snippet has nothing to seek through and nothing to skip to, so the lock
// screen shows neither.
export const SKIPPED_ACTIONS = ["seekto", "seekbackward", "seekforward", "previoustrack", "nexttrack"] as const;

type PositionState = { duration: number; position: number; playbackRate: number };

// The parts of navigator.mediaSession the engine uses, so the tests can pass
// a fake. setPositionState is missing from some older browsers.
export type MediaSessionLike = {
  metadata: unknown;
  playbackState?: string;
  setActionHandler(action: string, handler: (() => void) | null): void;
  setPositionState?(state: PositionState): void;
};

export type MetadataInit = { title: string; artist: string; album: string; artwork: readonly Artwork[] };

// metadata stands in for `new MediaMetadata(init)`, which Node doesn't have.
export type SessionEnv = { session: MediaSessionLike; metadata: (init: MetadataInit) => unknown };

export function browserSession(): SessionEnv | undefined {
  if (typeof navigator === "undefined" || !("mediaSession" in navigator) || typeof MediaMetadata !== "function") {
    return undefined;
  }
  return {
    session: navigator.mediaSession as MediaSessionLike,
    metadata: (init) => new MediaMetadata({ ...init, artwork: [...init.artwork] }),
  };
}

// The lock screen's play replays and its pause stops (SPEC-audio-engine.md,
// open question 2): the page has no paused state to show.
export function bindActions({ session }: SessionEnv, controls: { replay: () => void; stop: () => void }) {
  const set = (action: string, handler: (() => void) | null) => {
    try {
      session.setActionHandler(action, handler);
    } catch {
      // A browser throws on an action it doesn't support. The rest still apply.
    }
  };
  set("play", controls.replay);
  set("pause", controls.stop);
  set("stop", controls.stop);
  for (const action of SKIPPED_ACTIONS) set(action, null);
}

// Called on each change of state. The position is set when the phase or
// track changes, not on every timeupdate: the browser runs it on from there.
export function showPlayback({ session, metadata }: SessionEnv, playback: Playback, before: Playback, track?: EngineTrack) {
  if (!playback || !track) {
    session.metadata = null;
    session.playbackState = "none";
    return;
  }
  const newTrack = playback.trackId !== before?.trackId || !before;
  if (newTrack) {
    session.metadata = metadata({ title: track.title, artist: ARTIST, album: track.album, artwork: track.artwork });
  }
  session.playbackState = playback.phase === "ended" ? "paused" : "playing";
  if (newTrack || playback.phase !== before?.phase) {
    try {
      session.setPositionState?.({
        duration: playback.duration,
        position: Math.min(playback.elapsed, playback.duration),
        playbackRate: 1,
      });
    } catch {
      // Refused only for a bad duration or position, which the state rules out.
    }
  }
}
