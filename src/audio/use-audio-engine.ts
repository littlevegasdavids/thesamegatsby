import { useSyncExternalStore } from "react";
import type { AudioEngine } from "./engine.ts";
import type { Playback } from "./state.ts";

// Nothing has played during the static build's prerender, and the first
// client render matches it, so hydration never disagrees.
const serverSnapshot = (): Playback => null;

export function useAudioEngine(engine: AudioEngine): Playback {
  return useSyncExternalStore(engine.subscribe, engine.getSnapshot, serverSnapshot);
}
