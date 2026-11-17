"use client";

import { useEffect, useRef, useState } from "react";
import { createAudioEngine } from "../../audio/engine";
import type { EngineEnv } from "../../audio/engine";
import type { EngineTrack } from "../../audio/tracks";
import { useAudioEngine } from "../../audio/use-audio-engine";
import { barState, rowState } from "../../audio/view";
import styles from "./bench.module.css";
import { summarise } from "./stats";

type Tap = { trackId: string; at: number; intent: boolean };
type Run = Tap & { ms: number | "failed" };

// Read in event handlers only, never while rendering.
const newTap = (trackId: string, intent: boolean): Tap => ({ trackId, at: performance.now(), intent });

const ms = (value: number | undefined) => (value === undefined ? "–" : `${Math.round(value)} ms`);

// Muted by default: measuring needs the playing event, not sound. The flag
// lives outside React because the engine reads it when it makes its element.
function mutedEngine(tracks: readonly EngineTrack[]) {
  let muted = true;
  let element: HTMLAudioElement | undefined;
  const env: EngineEnv = {
    createElement: () => {
      element = new Audio();
      element.muted = muted;
      return element;
    },
    setTimeout: (fn, delay) => window.setTimeout(fn, delay),
    clearTimeout: (handle) => window.clearTimeout(handle as number),
  };
  const setMuted = (value: boolean) => {
    muted = value;
    if (element) element.muted = value;
  };
  return { engine: createAudioEngine(tracks, env), setMuted };
}

export function Bench({ tracks, leadTrackId }: { tracks: EngineTrack[]; leadTrackId: string }) {
  const tap = useRef<Tap | null>(null);
  const lastIntent = useRef<string | null>(null);
  const [runs, setRuns] = useState<Run[]>([]);

  const [{ engine, setMuted }] = useState(() => mutedEngine(tracks));
  const playback = useAudioEngine(engine);

  // The subscriber runs inside the element's playing event, so the time is
  // taken there and not after React renders.
  useEffect(
    () =>
      engine.subscribe(() => {
        const state = engine.getSnapshot();
        const pending = tap.current;
        if (!pending || state?.trackId !== pending.trackId) return;
        if (state.phase === "playing") {
          const run = { ...pending, ms: performance.now() - pending.at };
          tap.current = null;
          setRuns((all) => [...all, run]);
        } else if (state.failed) {
          tap.current = null;
          setRuns((all) => [...all, { ...pending, ms: "failed" }]);
        }
      }),
    [engine],
  );

  // Warm the hero's lead track once the page has loaded and gone idle.
  useEffect(() => {
    let cancel = () => {};
    const idle = () => {
      // Safari has no requestIdleCallback.
      if (typeof window.requestIdleCallback === "function") {
        const handle = window.requestIdleCallback(() => engine.warm(leadTrackId));
        cancel = () => window.cancelIdleCallback(handle);
      } else {
        const handle = window.setTimeout(() => engine.warm(leadTrackId), 1);
        cancel = () => window.clearTimeout(handle);
      }
    };
    if (document.readyState === "complete") idle();
    else window.addEventListener("load", idle, { once: true });
    return () => {
      window.removeEventListener("load", idle);
      cancel();
    };
  }, [engine, leadTrackId]);

  const intent = (trackId: string) => {
    lastIntent.current = trackId;
    engine.intent(trackId);
  };

  const toggle = (trackId: string) => {
    const state = rowState(engine.getSnapshot(), trackId);
    if (state === "loading" || state === "playing") {
      tap.current = null;
      engine.stop();
      return;
    }
    tap.current = newTap(trackId, lastIntent.current === trackId);
    lastIntent.current = null;
    engine.play(trackId);
  };

  const bar = barState(playback);
  const timed = runs.flatMap((run) => (typeof run.ms === "number" ? [run.ms] : []));
  const summary = summarise(timed);
  const title = (trackId: string) => tracks.find((track) => track.id === trackId)?.title ?? trackId;

  return (
    <main className={styles.page}>
      <h1 className={styles.title}>Audio bench</h1>
      <p className={styles.lede}>
        Each tap is timed to the element&apos;s <code>playing</code> event. The lead track, {title(leadTrackId)}, is
        warmed after load.
      </p>

      <label className={styles.mute}>
        <input
          type="checkbox"
          defaultChecked
          onChange={(event) => setMuted(event.target.checked)}
        />
        Muted
      </label>

      <ul className={styles.tracks}>
        {tracks.map((track) => {
          const state = rowState(playback, track.id);
          const pressed = state === "loading" || state === "playing";
          return (
            <li key={track.id}>
              <button
                type="button"
                className={styles.track}
                aria-pressed={pressed}
                data-track={track.id}
                onPointerDown={() => intent(track.id)}
                onFocus={() => intent(track.id)}
                onClick={() => toggle(track.id)}
              >
                <span>{`${pressed ? "Stop" : "Play"} ${track.title}`}</span>
                <span className={styles.state}>{state}</span>
              </button>
            </li>
          );
        })}
      </ul>

      <section className={styles.bar} aria-label="Bar">
        <p className={styles.state}>
          bar: {bar}
          {playback && ` · ${title(playback.trackId)} · ${playback.elapsed.toFixed(2)} / ${playback.duration} s`}
          {playback?.failed && " · failed"}
        </p>
        {(bar === "loading" || bar === "playing") && (
          <button type="button" className={styles.control} onClick={() => engine.stop()}>
            Stop
          </button>
        )}
        {bar === "ended" && (
          <>
            <button type="button" className={styles.control} onClick={() => engine.replay()}>
              Replay
            </button>
            <button type="button" className={styles.control} onClick={() => engine.close()}>
              Close
            </button>
          </>
        )}
      </section>

      <section aria-label="Taps">
        <p className={styles.state} data-summary>
          {`${summary.runs} timed · median ${ms(summary.median)} · worst ${ms(summary.worst)}`}
        </p>
        <ol className={styles.runs} data-runs={JSON.stringify(runs)}>
          {runs.map((run, index) => (
            <li key={index}>
              {`${title(run.trackId)} · tapped at ${(run.at / 1000).toFixed(1)} s · ${run.intent ? "intent first" : "no intent"} · `}
              {typeof run.ms === "number" ? ms(run.ms) : "failed"}
            </li>
          ))}
        </ol>
        <button type="button" className={styles.control} onClick={() => setRuns([])}>
          Clear
        </button>
      </section>
    </main>
  );
}
