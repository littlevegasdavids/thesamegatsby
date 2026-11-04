import type { ButtonIcon } from "../Button/glyphs.ts";
import type { ReadoutMode } from "../VhsReadout/modes.ts";

// What a NowPlayingBar shows in each state, kept out of the .tsx so
// tests/now-playing-bar.test.ts can check it. While the snippet loads or
// plays, the bar offers Stop. Once it ends, the bar stays up: Replay takes
// Stop's place, Close joins it, and the stream links fill amber under
// "Hear the full track" (G5).

export const NOW_PLAYING_STATES = ["loading", "playing", "ended"] as const;

export type NowPlayingState = (typeof NOW_PLAYING_STATES)[number];

export type NowPlayingView = {
  mode: ReadoutMode;
  ratio: number;
  control: { icon: Extract<ButtonIcon, "stop" | "replay">; label: string };
  close: boolean;
  heading: string;
  emphasis: boolean;
  /** For the polite live region: what changed, never the ticking time. */
  announce: string;
};

const MODE: Record<NowPlayingState, ReadoutMode> = { loading: "load", playing: "play", ended: "ended" };

export function nowPlayingView(state: NowPlayingState, title: string, elapsed: number, duration: number): NowPlayingView {
  const ended = state === "ended";
  // ProgressTape holds a ratio to 0–1 and reads NaN as 0. A length of 0
  // (unknown yet) would divide to Infinity, so it reads 0 here too.
  const ratio = ended ? 1 : state === "loading" || !(duration > 0) ? 0 : elapsed / duration;
  return {
    mode: MODE[state],
    ratio,
    control: ended ? { icon: "replay", label: "Replay snippet" } : { icon: "stop", label: "Stop snippet" },
    close: ended,
    heading: ended ? "Hear the full track" : "Stream full track",
    emphasis: ended,
    announce: state === "playing" ? `Playing ${title}` : ended ? "Snippet ended" : "",
  };
}
