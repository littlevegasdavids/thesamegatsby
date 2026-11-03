import styles from "./VhsReadout.module.css";
import {
  READOUT_GLYPH_PATHS,
  READOUT_GLYPH_SIZE,
  READOUT_GLYPH_VIEWBOX,
  READOUT_MODES,
  readoutText,
  type ReadoutMode,
} from "./modes";

// The VCR readout on the now-playing bar: "PLAY 00:12 / 00:30". It's plain
// text, not a live region, so a screen reader reads it when it gets there
// rather than announcing every second.
export function VhsReadout({ mode, elapsed, duration }: { mode: ReadoutMode; elapsed: number; duration: number }) {
  const { glyph, lit } = READOUT_MODES[mode];

  return (
    <span className={lit ? `${styles.readout} ${styles.lit}` : styles.readout}>
      <svg
        className={styles.glyph}
        width={READOUT_GLYPH_SIZE}
        height={READOUT_GLYPH_SIZE}
        viewBox={READOUT_GLYPH_VIEWBOX}
        aria-hidden
      >
        <path d={READOUT_GLYPH_PATHS[glyph]} fill="currentColor" />
      </svg>
      {readoutText(mode, elapsed, duration)}
    </span>
  );
}
