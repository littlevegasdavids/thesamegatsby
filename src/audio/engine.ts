import { bindActions, browserSession, showPlayback } from "./media-session.ts";
import type { SessionEnv } from "./media-session.ts";
import { next } from "./state.ts";
import type { EngineEvent, Playback } from "./state.ts";
import type { EngineTrack } from "./tracks.ts";

export type { EngineTrack } from "./tracks.ts";

// A snippet still loading after this long is reported as failed, so the bar
// never sits on the load glyph forever.
export const LOAD_TIMEOUT = 10_000;

// The parts of HTMLAudioElement the engine uses, so the tests can pass a fake.
export type MediaElementLike = EventTarget & {
  src: string;
  preload: string;
  currentTime: number;
  readonly paused: boolean;
  readonly ended: boolean;
  play(): Promise<void>;
  pause(): void;
  load(): void;
};

export type EngineEnv = {
  createElement: () => MediaElementLike;
  setTimeout: (fn: () => void, ms: number) => unknown;
  clearTimeout: (handle: unknown) => void;
  // Left out where the browser has no Media Session.
  mediaSession?: SessionEnv;
};

export type AudioEngine = {
  play(trackId: string): void; // call inside the tap handler
  stop(): void;
  replay(): void;
  close(): void;
  intent(trackId: string): void; // pointerdown or focus: start the fetch
  warm(trackId: string): void; // after load: fetch the first range only
  subscribe(listener: () => void): () => void;
  getSnapshot(): Playback;
};

// Resolved only when the engine first needs an element, so importing this
// module during the static build never touches window.
const browserEnv = (): EngineEnv => ({
  createElement: () => new Audio(),
  setTimeout: (fn, ms) => globalThis.setTimeout(fn, ms),
  clearTimeout: (handle) => globalThis.clearTimeout(handle as ReturnType<typeof setTimeout>),
  mediaSession: browserSession(),
});

export function createAudioEngine(tracks: readonly EngineTrack[], env?: EngineEnv): AudioEngine {
  const byId = new Map(tracks.map((track) => [track.id, track]));
  const listeners = new Set<() => void>();
  let state: Playback = null;
  let audio: MediaElementLike | undefined;
  let timer: unknown;
  let resolved: EngineEnv | undefined;
  // Bumped by every play, replay and stop, so a play() promise that settles
  // after a later tap can't fail the track that replaced it.
  let generation = 0;
  let actionsBound = false;

  const environment = () => (resolved ??= env ?? browserEnv());

  const lookup = (trackId: string) => {
    const track = byId.get(trackId);
    if (!track) throw new Error(`audio-engine: no track "${trackId}"`);
    return track;
  };

  const clearTimer = () => {
    if (timer === undefined) return;
    environment().clearTimeout(timer);
    timer = undefined;
  };

  const dispatch = (event: EngineEvent) => {
    const before = state;
    state = next(state, event);
    if (state === before) return;
    const session = environment().mediaSession;
    if (session) showPlayback(session, state, before, state ? byId.get(state.trackId) : undefined);
    if (state?.phase !== "loading") clearTimer();
    else if (before?.phase !== "loading" || event.type === "play" || event.type === "replay") {
      clearTimer();
      timer = environment().setTimeout(onTimeout, LOAD_TIMEOUT);
    }
    for (const listener of listeners) listener();
  };

  const onTimeout = () => {
    timer = undefined;
    dispatch({ type: "timeout" });
    // Otherwise a file that turns up late would sound under an ended bar.
    if (audio && !audio.paused) audio.pause();
  };

  const element = () => {
    if (audio) return audio;
    const made = environment().createElement();
    made.addEventListener("playing", () => dispatch({ type: "playing" }));
    made.addEventListener("waiting", () => dispatch({ type: "waiting" }));
    made.addEventListener("timeupdate", () => dispatch({ type: "timeupdate", time: made.currentTime }));
    made.addEventListener("ended", () => dispatch({ type: "ended" }));
    // A real element fires pause just before ended, which isn't an interruption.
    // The engine's own pauses land on a state where "interrupted" changes nothing.
    made.addEventListener("pause", () => made.ended || dispatch({ type: "interrupted" }));
    made.addEventListener("error", () => dispatch({ type: "error" }));
    audio = made;
    return made;
  };

  // Points the element at the track and plays it, synchronously, so iOS sees
  // play() inside the tap.
  const start = (track: EngineTrack, reload: boolean) => {
    const media = element();
    const session = environment().mediaSession;
    // Bound on the first tap, so the lock screen's buttons belong to a page
    // that has actually played something.
    if (session && !actionsBound) {
      bindActions(session, { replay: () => engine.replay(), stop: () => engine.stop() });
      actionsBound = true;
    }
    const mine = ++generation;
    if (!media.paused) media.pause();
    media.preload = "auto";
    if (media.src !== track.src) media.src = track.src;
    else if (reload) media.load();
    else media.currentTime = 0;

    let played: Promise<void>;
    try {
      played = media.play();
    } catch {
      dispatch({ type: "error" });
      return;
    }
    played.catch((error: unknown) => {
      // A later tap, or a source change, rejects the earlier play() with AbortError.
      if (mine !== generation || (error instanceof Error && error.name === "AbortError")) return;
      dispatch({ type: "error" });
    });
  };

  const idle = () => state?.phase !== "loading" && state?.phase !== "playing";

  const engine: AudioEngine = {
    play(trackId) {
      const track = lookup(trackId);
      const reload = state?.trackId === trackId && state.failed;
      dispatch({ type: "play", trackId, duration: track.duration });
      start(track, reload);
    },
    stop() {
      if (idle()) return;
      generation++;
      dispatch({ type: "stop" });
      if (audio && !audio.paused) audio.pause();
    },
    replay() {
      if (state?.phase !== "ended") return;
      const track = lookup(state.trackId);
      const reload = state.failed;
      dispatch({ type: "replay" });
      start(track, reload);
    },
    close() {
      dispatch({ type: "close" });
    },
    intent(trackId) {
      const track = lookup(trackId);
      const media = element();
      if (!idle()) return;
      media.preload = "auto";
      if (media.src !== track.src) media.src = track.src;
    },
    warm(trackId) {
      const track = lookup(trackId);
      const media = element();
      // Only a fresh element: never undo an intent() or a tap.
      if (state || media.src) return;
      media.preload = "metadata";
      media.src = track.src;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
    getSnapshot: () => state,
  };
  return engine;
}
