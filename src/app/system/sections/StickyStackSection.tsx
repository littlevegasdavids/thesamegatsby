import { SystemFrame } from "../SystemFrame";
import styles from "../system.module.css";
import { StickyStack, type StackStart } from "./StickyStack";

const FRAME_H = 640;

const FRAMES: readonly { start: StackStart; caption: string }[] = [
  { start: "top", caption: "At the top · the album and the EP open" },
  { start: "album-stuck", caption: "Mid-scroll · the album stuck under the filter, its tracks under it" },
  { start: "hand-off", caption: "The hand-off · the album leaving with its last track" },
  { start: "collapsed", caption: "Every release collapsed · only the header and filter stick" },
];

// The three sticky layers together, one frame per state. Each frame is live:
// scroll it, filter it, open and close releases, and tap a track to play it.
// The frames run to the screen's edges, so at each width they show the
// layout that width gets.
export function StickyStackSection() {
  return (
    <section className={styles.section} aria-labelledby="sticky-stack">
      <h2 id="sticky-stack" className={styles.heading}>Sticky stack</h2>
      <ul className={`${styles.rows} ${styles.frames}`}>
        {FRAMES.map(({ start, caption }) => (
          <li key={start} className={styles.stack}>
            <SystemFrame label={caption} height={FRAME_H}>
              <StickyStack start={start} />
            </SystemFrame>
            <span className={styles.cap}>{caption}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
