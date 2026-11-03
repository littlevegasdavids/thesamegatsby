// From its own file, not index.ts: through the barrel, which also exports
// Screen, the build put /system's CSS in the chunk / loads.
import { Button } from "../../../design-system/components/Button/Button";
import styles from "../system.module.css";

// Each variant at rest and disabled. Hover, press and focus are live rather
// than pinned, so they're seen as a visitor sees them: hover with a mouse,
// press with a tap, and the ring only from the keyboard.
export function ButtonSection() {
  return (
    <section className={styles.section} aria-labelledby="buttons">
      <h2 id="buttons" className={styles.heading}>Buttons</h2>
      <p className={`${styles.cap} ${styles.sectionNote}`}>Hover, press or Tab through them for the other states</p>
      <div className={styles.blocks}>
        <section aria-labelledby="buttons-primary">
          <h3 id="buttons-primary" className={`${styles.label} ${styles.blockHeading}`}>Primary</h3>
          <ul className={styles.rows}>
            <li className={styles.stack}>
              <span className={styles.buttons}>
                <Button variant="primary" icon="play" label="Play snippet" />
                <Button variant="primary" icon="stop" label="Stop snippet" />
              </span>
              <span className={styles.cap}>48 px · amber · the cut corner · lit on hover and press</span>
              <code className={styles.code}>--dg-on-accent on --dg-accent · --dg-chamfer</code>
            </li>
            <li className={styles.stack}>
              <span className={styles.buttons}>
                <Button variant="primary" icon="play" label="Play snippet" disabled />
              </span>
              <span className={styles.cap}>Disabled · the lamp off</span>
              <code className={styles.code}>--dg-fg-subtle on --dg-surface-raised</code>
            </li>
          </ul>
        </section>

        <section aria-labelledby="buttons-ghost">
          <h3 id="buttons-ghost" className={`${styles.label} ${styles.blockHeading}`}>Ghost</h3>
          <ul className={styles.rows}>
            <li className={styles.stack}>
              <span className={styles.buttons}>
                <Button variant="ghost" label="Ghost" />
                <Button variant="ghost" icon="replay" label="Replay snippet" />
              </span>
              <span className={styles.cap}>48 px · outline · filled on hover and press</span>
              <code className={styles.code}>--dg-fg · --dg-outline · --dg-surface-raised</code>
            </li>
            <li className={styles.stack}>
              <span className={styles.buttons}>
                <Button variant="ghost" label="Ghost" disabled />
              </span>
              <span className={styles.cap}>Disabled</span>
              <code className={styles.code}>--dg-fg-subtle</code>
            </li>
          </ul>
        </section>

        <section aria-labelledby="buttons-hardware">
          <h3 id="buttons-hardware" className={`${styles.label} ${styles.blockHeading}`}>Hardware</h3>
          <ul className={styles.rows}>
            <li className={styles.stack}>
              <span className={styles.buttons}>
                <Button variant="hardware" icon="stop" label="Stop snippet" />
                <Button variant="hardware" icon="replay" label="Replay snippet" />
                <Button variant="hardware" icon="close" label="Close player" />
              </span>
              <span className={styles.cap}>44 px square · stop, replay, close · named by its label</span>
              <code className={styles.code}>--dg-fg · --dg-outline · --dg-surface-raised</code>
            </li>
            <li className={styles.stack}>
              <span className={styles.buttons}>
                <Button variant="hardware" icon="stop" label="Stop snippet" disabled />
              </span>
              <span className={styles.cap}>Disabled</span>
              <code className={styles.code}>--dg-fg-subtle</code>
            </li>
          </ul>
        </section>
      </div>
    </section>
  );
}
