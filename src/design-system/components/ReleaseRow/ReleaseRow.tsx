import Image from "next/image";
import { useId } from "react";
import type { Release } from "../../types";
import { GLYPH_VIEWBOX, GLYPHS } from "../Button/glyphs";
import { SparkleStar } from "../SparkleStar/SparkleStar";
import { TrackRow } from "../TrackRow/TrackRow";
import styles from "./ReleaseRow.module.css";
import { releaseRowView, type PlayState } from "./view";

type ReleaseRowProps = {
  release: Release;
  /** An EP or album's tracks are showing. Ignored for a single. */
  expanded?: boolean;
  /** The track playing anywhere on the page, or none. */
  playingTrackId?: string | null;
  playState?: PlayState;
  elapsed?: number;
  /** Opens or closes an EP or album. */
  onToggle?: () => void;
  /** Plays or stops a track: the single's own, or a nested one. */
  onPlay?: (trackId: string) => void;
};

// One release in the discography. A single's row is the button that plays
// it. An EP or album's row opens its tracks beneath it, and while open it
// sticks under the filter inside its own group, so it stays put while its
// tracks scroll under it and leaves with the last of them. Stream links are
// never inside a row.
export function ReleaseRow({ release, expanded = false, playingTrackId, playState, elapsed = 0, onToggle, onPlay }: ReleaseRowProps) {
  const tracksId = `${useId()}-tracks`;
  const view = releaseRowView(release, { expanded, playingTrackId, playState, elapsed });
  const cover = <Image className={styles.cover} src={release.cover} alt="" width={60} height={60} />;
  const title = <span className={styles.title}>{release.title}</span>;

  if (view.kind === "single") {
    const className = [styles.row, view.lit && styles.lit, view.running && styles.running, view.playing && styles.playing]
      .filter(Boolean)
      .join(" ");
    const ring = GLYPHS[view.running ? "stop" : "play"];
    return (
      <div>
        <button
          type="button"
          className={className}
          aria-pressed={view.running}
          aria-label={view.label}
          onClick={onPlay && (() => onPlay(release.leadTrackId))}
        >
          {cover}
          <span className={styles.text}>
            {title}
            <span className={styles.meta}>
              {view.lit && <SparkleStar size={12} />}
              {view.meta}
              {view.tag && <span className={styles.tag}>{view.tag}</span>}
            </span>
          </span>
          <span className={styles.length}>{view.length}</span>
          <span className={styles.ring}>
            <svg width={14} height={14} viewBox={GLYPH_VIEWBOX} aria-hidden>
              <path d={ring.d} fill="currentColor" />
            </svg>
          </span>
        </button>
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        className={expanded ? `${styles.row} ${styles.expanded}` : styles.row}
        aria-expanded={expanded}
        aria-controls={tracksId}
        aria-label={view.label}
        onClick={onToggle}
      >
        {cover}
        <span className={styles.text}>
          {title}
          <span className={styles.meta}>{view.meta}</span>
        </span>
        <span className={styles.toggleText}>{view.toggleText}</span>
        <span className={`${styles.ring} ${styles.chevronRing}`}>
          <svg className={expanded ? `${styles.chevron} ${styles.open}` : styles.chevron} width={16} height={16} viewBox="0 0 24 24" aria-hidden>
            <path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </button>
      <div id={tracksId} hidden={!expanded}>
        {release.tracks.map((track, i) => (
          <TrackRow
            key={track.id}
            variant="nested"
            index={i + 1}
            title={track.title}
            duration={track.duration}
            elapsed={view.trackStates[i] === "idle" ? 0 : elapsed}
            state={view.trackStates[i]}
            onToggle={onPlay && (() => onPlay(track.id))}
          />
        ))}
      </div>
    </div>
  );
}
