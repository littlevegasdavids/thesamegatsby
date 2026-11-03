// From its own file, not index.ts: through the barrel, which also exports
// Screen, the build put /system's CSS in the chunk / loads.
import { VhsReadout } from "../../../design-system/components/VhsReadout/VhsReadout";
import styles from "../system.module.css";

// Each mode on the now-playing bar's surface, at the time the bar boards
// show. Load also appears before the audio knows its length. The readout
// face has no triangle, square or dotted circle, so the captions name them.
export function ReadoutSection() {
  return (
    <section className={styles.section} aria-labelledby="readout">
      <h2 id="readout" className={styles.heading}>Readout</h2>
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
      </div>
    </section>
  );
}
