// From its own file, not index.ts: through the barrel, the build put
// /system's CSS in the chunk / loads.
import { TrackRow } from "../../../design-system/components/TrackRow/TrackRow";
import type { TrackRowState } from "../../../design-system/components/TrackRow/states";
import type { Release } from "../../../design-system/types";
import { FIXTURE_RELEASES } from "../fixtures";
import styles from "../system.module.css";

const release = (id: string): Release => {
  const found = FIXTURE_RELEASES.find((r) => r.id === id);
  if (!found) throw new Error(`No fixture release ${id}`);
  return found;
};

const ALBUM = release("album-x");

// The boards' 12 of 30 while playing, and the full 30 once played.
const ELAPSED: Record<TrackRowState, number> = { idle: 0, loading: 0, playing: 12, played: 30 };

const STATES: readonly TrackRowState[] = ["idle", "loading", "playing", "played"];

// Longer than a 360 px row can hold, to show the title truncating before the
// time and ring.
const LONG_TITLE = "You who could be Forever (Extended Night Drive Version)";

// Each variant in its four states, on the surface it sits on: nested rows
// under an expanded release, on the page's backdrop, and the hero's list
// rows under their hairline, with LEAD on the lead track.
export function DiscographySection() {
  const tracks = ALBUM.tracks.slice(0, STATES.length);

  return (
    <section className={styles.section} aria-labelledby="discography">
      <h2 id="discography" className={styles.heading}>Discography</h2>
      <div className={styles.blocks}>
        <section aria-labelledby="discography-nested">
          <h3 id="discography-nested" className={`${styles.label} ${styles.blockHeading}`}>Track rows · nested</h3>
          <div className={styles.stack}>
            <div className={styles.trackGroup}>
              {tracks.map((track, i) => (
                <TrackRow
                  key={track.id}
                  variant="nested"
                  index={i + 1}
                  title={track.title}
                  duration={track.duration}
                  elapsed={ELAPSED[STATES[i]]}
                  state={STATES[i]}
                />
              ))}
              <TrackRow variant="nested" index={5} title={LONG_TITLE} duration={30} elapsed={0} state="idle" />
            </div>
            <span className={styles.cap}>Idle · loading · playing 00:12 · played · a long title</span>
          </div>
        </section>
        <section aria-labelledby="discography-list">
          <h3 id="discography-list" className={`${styles.label} ${styles.blockHeading}`}>Track rows · list</h3>
          <div className={styles.stack}>
            <div className={styles.trackList}>
              {tracks.map((track, i) => (
                <TrackRow
                  key={track.id}
                  variant="list"
                  index={i + 1}
                  title={track.title}
                  duration={track.duration}
                  elapsed={ELAPSED[STATES[i]]}
                  state={STATES[i]}
                  lead={track.id === ALBUM.leadTrackId}
                />
              ))}
              <TrackRow variant="list" index={5} title={LONG_TITLE} duration={30} elapsed={0} state="idle" lead />
            </div>
            <span className={styles.cap}>Idle with LEAD · loading · playing 00:12 · played · a long title with LEAD</span>
          </div>
        </section>
      </div>
    </section>
  );
}
