import type { Playback } from "../../audio/state.ts";
import { barState, rowState } from "../../audio/view.ts";
import type { Release, StreamLink } from "../../design-system/types.ts";

// What the homepage hands its components from the engine's state, kept out
// of Home.tsx so it can be tested.

export type PageState = {
  playingTrackId: string | null;
  playState: "loading" | "playing" | "played" | undefined;
  elapsed: number;
};

export function pageState(playback: Playback): PageState {
  if (!playback) return { playingTrackId: null, playState: undefined, elapsed: 0 };
  const state = rowState(playback, playback.trackId);
  return { playingTrackId: playback.trackId, playState: state === "idle" ? undefined : state, elapsed: playback.elapsed };
}

// A play control toggles: tapping the running track stops it.
export function shouldStop(playback: Playback, trackId: string): boolean {
  const state = rowState(playback, trackId);
  return state === "loading" || state === "playing";
}

export type BarTrack = {
  track: { title: string; cover: string };
  state: "loading" | "playing" | "ended";
  links: readonly StreamLink[];
};

export function barTrack(playback: Playback, releases: readonly Release[]): BarTrack | null {
  const state = barState(playback);
  if (!playback || state === "hidden") return null;
  for (const release of releases) {
    const track = release.tracks.find(({ id }) => id === playback.trackId);
    if (track) return { track: { title: track.title, cover: release.cover }, state, links: release.links };
  }
  throw new Error(`The page lists no track ${playback.trackId}`);
}

type Clicked = { closest(selector: string): { getAttribute(name: string): string | null } | null } | null;

// A stream link, a "More" platform or a social: the fan is leaving to hear
// the full track, so the snippet stops (audio-engine's open question 6).
export function opensElsewhere(target: Clicked): boolean {
  const link = target?.closest("a[href]");
  return !!link && link.getAttribute("target") === "_blank";
}

type Focusable = { isConnected: boolean; checkVisibility?: () => boolean; focus: () => void };

// Where focus goes when the bar closes. Only a keyboard user needs moving, to
// the control that played, or the page's first one if a filter or a closed EP
// has taken it away. A tap stays put, so the page doesn't jump.
export function focusAfterClose<T extends Focusable>(byKeyboard: boolean, played: T | null, fallback: T | null): T | null {
  if (!byKeyboard) return null;
  return played?.isConnected && played.checkVisibility?.() !== false ? played : fallback;
}
