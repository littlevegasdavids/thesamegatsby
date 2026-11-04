import { GLYPH_VIEWBOX, GLYPHS } from "../Button/glyphs";
import { SparkleStar } from "../SparkleStar/SparkleStar";
import { READOUT_GLYPH_PATHS, READOUT_GLYPH_SIZE, READOUT_GLYPH_VIEWBOX } from "../VhsReadout/modes";
import styles from "./TrackRow.module.css";
import { trackNumber, trackRowLabel, trackRowLook, trackRowTime, type TrackRowState, type TrackRowVariant } from "./states";

type TrackRowProps = {
  /** The track's place on its release, from 1. */
  index: number;
  title: string;
  /** The snippet's length, in seconds. */
  duration: number;
  /** Seconds played so far, shown while playing. */
  elapsed: number;
  state: TrackRowState;
  /** Marks the lead track in a hero tracklist. */
  lead?: boolean;
  variant: TrackRowVariant;
  onToggle?: () => void;
};

// One track: the whole row is the button that plays or stops its snippet.
// The aria-label carries the name, so the number, time and LEAD tag are for
// the eye. The number, time and ring columns have fixed widths, so a state
// change never moves the title.
export function TrackRow({ index, title, duration, elapsed, state, lead = false, variant, onToggle }: TrackRowProps) {
  const { lit, running } = trackRowLook(state);
  const time = trackRowTime(state, elapsed, duration);
  const ring = GLYPHS[running ? "stop" : "play"];
  const className = [styles.row, styles[variant], lit && styles.lit, running && styles.running].filter(Boolean).join(" ");

  return (
    <button type="button" className={className} aria-pressed={running} aria-label={trackRowLabel(title, state)} onClick={onToggle}>
      <span className={styles.index}>{lit ? <SparkleStar size={14} /> : trackNumber(index)}</span>
      <span className={styles.title}>
        <span className={styles.titleText}>{title}</span>
        {lead && <span className={styles.lead}>LEAD</span>}
      </span>
      <span className={styles.time}>
        {time ?? (
          <svg
            className={styles.loadGlyph}
            width={READOUT_GLYPH_SIZE}
            height={READOUT_GLYPH_SIZE}
            viewBox={READOUT_GLYPH_VIEWBOX}
            aria-hidden
          >
            <path d={READOUT_GLYPH_PATHS["◌"]} fill="currentColor" />
          </svg>
        )}
      </span>
      <span className={styles.ring}>
        <svg width={12} height={12} viewBox={GLYPH_VIEWBOX} aria-hidden>
          <path d={ring.d} fill="currentColor" />
        </svg>
      </span>
    </button>
  );
}
