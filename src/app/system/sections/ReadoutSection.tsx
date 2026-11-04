// From its own file, not index.ts: through the barrel, which also exports
// Screen, the build put /system's CSS in the chunk / loads.
import { ProgressTape } from "../../../design-system/components/ProgressTape/ProgressTape";
import { VhsReadout } from "../../../design-system/components/VhsReadout/VhsReadout";
import { RunningTape } from "./RunningTape";
import styles from "../system.module.css";

// The top of the now-playing bar. Each readout mode sits on the bar's
// surface, at the time the bar boards show; load also appears before the
// audio knows its length. The readout face has no triangle, square or dotted
// circle, so the captions name them. The tape runs along the top edge, as on
// the boards, at 0, the boards' 12 of 30, and 1, each over the readout it
// goes with, then running.
export function ReadoutSection() {
  return (
    <section className={styles.section} aria-labelledby="readout">
      <h2 id="readout" className={styles.heading}>Readout and tape</h2>
      <div className={styles.blocks}>
        <section aria-labelledby="readout-vhs">
          <h3 id="readout-vhs" className={`${styles.label} ${styles.blockHeading}`}>VHS readout</h3>
          <ul className={styles.rows}>
            <li className={styles.stack}>
              <span className={styles.bar}>
                <VhsReadout mode="load" elapsed={0} duration={30} />
              </span>
              <span className={styles.cap}>Load · dotted circle · muted</span>
              <code className={styles.code}>--dg-fg-muted</code>
            </li>
            <li className={styles.stack}>
              <span className={styles.bar}>
                <VhsReadout mode="load" elapsed={0} duration={Number.NaN} />
              </span>
              <span className={styles.cap}>Load, before the length is known · blank tape</span>
              <code className={styles.code}>formatTime</code>
            </li>
            <li className={styles.stack}>
              <span className={styles.bar}>
                <VhsReadout mode="play" elapsed={12} duration={30} />
              </span>
              <span className={styles.cap}>Play · triangle · amber, lit</span>
              <code className={styles.code}>--dg-accent · --dg-glow-accent</code>
            </li>
            <li className={styles.stack}>
              <span className={styles.bar}>
                <VhsReadout mode="stop" elapsed={12} duration={30} />
              </span>
              <span className={styles.cap}>Stop · square · muted</span>
              <code className={styles.code}>--dg-fg-muted</code>
            </li>
            <li className={styles.stack}>
              <span className={styles.bar}>
                <VhsReadout mode="ended" elapsed={30} duration={30} />
              </span>
              <span className={styles.cap}>Ended · square · muted · reads END</span>
              <code className={styles.code}>--dg-fg-muted</code>
            </li>
          </ul>
        </section>
        <section aria-labelledby="readout-tape">
          <h3 id="readout-tape" className={`${styles.label} ${styles.blockHeading}`}>Progress tape</h3>
          <ul className={styles.rows}>
            <li className={styles.stack}>
              <div className={styles.tapeStrip}>
                <ProgressTape ratio={0} />
                <span className={styles.bar}>
                  <VhsReadout mode="load" elapsed={0} duration={30} />
                </span>
              </div>
              <span className={styles.cap}>0 · blank tape · flush</span>
              <code className={styles.code}>--dg-line</code>
            </li>
            <li className={styles.stack}>
              <div className={styles.tapeStrip}>
                <ProgressTape ratio={0.4} />
                <span className={styles.bar}>
                  <VhsReadout mode="play" elapsed={12} duration={30} />
                </span>
              </div>
              <span className={styles.cap}>0.4 · 12 of 30, as on the boards</span>
              <code className={styles.code}>--dg-accent · --dg-glow-accent-box</code>
            </li>
            <li className={styles.stack}>
              <div className={styles.tapeStrip}>
                <ProgressTape ratio={1} />
                <span className={styles.bar}>
                  <VhsReadout mode="ended" elapsed={30} duration={30} />
                </span>
              </div>
              <span className={styles.cap}>1 · full · flush</span>
              <code className={styles.code}>scaleX(var(--progress))</code>
            </li>
            <li className={styles.stack}>
              <RunningTape />
              <span className={styles.cap}>Running · ticks every 250 ms · glides between · jumps under reduced motion</span>
              <code className={styles.code}>--dg-dur-2 · linear</code>
            </li>
          </ul>
        </section>
      </div>
    </section>
  );
}
