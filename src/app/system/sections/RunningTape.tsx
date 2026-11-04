"use client";

import { useEffect, useState } from "react";
// From their own files, not index.ts, as in ReadoutSection.
import { ProgressTape } from "../../../design-system/components/ProgressTape/ProgressTape";
import { VhsReadout } from "../../../design-system/components/VhsReadout/VhsReadout";
import styles from "../system.module.css";

// A 30 s snippet on a timer, so the tape's motion can be checked. The clock
// ticks every 250 ms, as an audio element's timeupdate does, and the fill
// glides between ticks, or jumps under reduced motion. It holds at the end
// for a second, then rewinds and runs again.
const SNIPPET = 30;
const TICK = 0.25;
const HOLD = 1;

export function RunningTape() {
  const [running, setRunning] = useState(false);
  const [clock, setClock] = useState(0);

  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => setClock((t) => (t >= SNIPPET + HOLD ? 0 : t + TICK)), TICK * 1000);
    return () => clearInterval(timer);
  }, [running]);

  const elapsed = Math.min(clock, SNIPPET);
  const mode = elapsed === SNIPPET ? "ended" : running ? "play" : "stop";

  return (
    <>
      <label className={styles.toggle}>
        <input
          type="checkbox"
          className={styles.toggleInput}
          checked={running}
          onChange={(event) => setRunning(event.target.checked)}
        />
        Run the tape
      </label>
      <div className={styles.tapeStrip}>
        <ProgressTape ratio={elapsed / SNIPPET} />
        <span className={styles.bar}>
          <VhsReadout mode={mode} elapsed={elapsed} duration={SNIPPET} />
        </span>
      </div>
    </>
  );
}
