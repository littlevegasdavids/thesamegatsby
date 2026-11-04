"use client";

import { useId, useState } from "react";
import { TrackRow } from "../TrackRow/TrackRow";
import styles from "./ReleaseHero.module.css";
import { showAllLabel, type HeroTrack } from "./view";

type HeroTracklistProps = {
  label: string;
  tracks: readonly HeroTrack[];
  /** How many show before "Show all". */
  shown: number;
  /** Opens "Show all" on first render, so /system can show it open. */
  defaultShowAll?: boolean;
  onPlay?: (trackId: string) => void;
};

// The hero's tracklist: list TrackRows under a hairline, LEAD on the lead
// track. Tracks past `shown` stay in the page, hidden while "Show all" is
// closed, so aria-controls always points at them. The toggle comes after
// them, so the tracks it opens sit between it and the rows above, and focus
// stays on it either way.
export function HeroTracklist({ label, tracks, shown, defaultShowAll = false, onPlay }: HeroTracklistProps) {
  const [open, setOpen] = useState(defaultShowAll);
  const restId = `${useId()}-rest`;

  const row = (t: HeroTrack) => (
    <TrackRow
      key={t.id}
      variant="list"
      index={t.index}
      title={t.title}
      duration={t.duration}
      elapsed={t.elapsed}
      state={t.state}
      lead={t.lead}
      onToggle={onPlay && (() => onPlay(t.id))}
    />
  );

  return (
    <div className={styles.tracklist}>
      <p className={styles.listLabel}>{label}</p>
      <div className={styles.list}>
        {tracks.slice(0, shown).map(row)}
        {shown < tracks.length && (
          <div id={restId} hidden={!open}>
            {tracks.slice(shown).map(row)}
          </div>
        )}
      </div>
      {shown < tracks.length && (
        <button
          type="button"
          className={styles.showAll}
          aria-expanded={open}
          aria-controls={restId}
          onClick={() => setOpen((was) => !was)}
        >
          {showAllLabel(open, tracks.length)}
          <svg className={open ? `${styles.chevron} ${styles.open}` : styles.chevron} width={14} height={14} viewBox="0 0 24 24" aria-hidden>
            <path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      )}
    </div>
  );
}
