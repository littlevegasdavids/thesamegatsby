import type { CSSProperties } from "react";
import styles from "./ProgressTape.module.css";
import { tapeProgress } from "./progress";

// The 3 px strip along the top of the now-playing bar: an amber fill on a
// hairline track, scaled to `ratio` (0 to 1). It's visual only, so it's
// hidden from assistive tech: the readout beside it carries the time as text.
export function ProgressTape({ ratio }: { ratio: number }) {
  return (
    <div className={styles.tape} style={{ "--progress": tapeProgress(ratio) } as CSSProperties} aria-hidden>
      <div className={styles.fill} />
    </div>
  );
}
