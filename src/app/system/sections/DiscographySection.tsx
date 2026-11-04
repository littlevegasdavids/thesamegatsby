// From its own file, not index.ts: through the barrel, the build put
// /system's CSS in the chunk / loads.
import { ReleaseRow } from "../../../design-system/components/ReleaseRow/ReleaseRow";
import type { PlayState } from "../../../design-system/components/ReleaseRow/view";
import { TrackRow } from "../../../design-system/components/TrackRow/TrackRow";
import type { TrackRowState } from "../../../design-system/components/TrackRow/states";
import type { Release } from "../../../design-system/types";
import { FIXTURE_RELEASES } from "../fixtures";
import styles from "../system.module.css";
import { FilterBench } from "./FilterBench";

const release = (id: string): Release => {
  const found = FIXTURE_RELEASES.find((r) => r.id === id);
  if (!found) throw new Error(`No fixture release ${id}`);
  return found;
};

const ALBUM = release("album-x");
const NO_ALBUMS = FIXTURE_RELEASES.filter(({ type }) => type !== "album");

// The boards' 12 of 30 while playing, and the full 30 once played.
const ELAPSED: Record<TrackRowState, number> = { idle: 0, loading: 0, playing: 12, played: 30 };

const STATES: readonly TrackRowState[] = ["idle", "loading", "playing", "played"];

// Longer than a 360 px row can hold, to show the title truncating before the
// time and ring.
const LONG_TITLE = "You who could be Forever (Extended Night Drive Version)";

// Every release-row state the spec lists, one row each: what's playing is
// set per row, so the states sit side by side.
const RELEASE_STATES: readonly {
  release: Release;
  caption: string;
  expanded?: boolean;
  playing?: { trackId: string; state: PlayState; elapsed: number };
}[] = [
  { release: release("vapor-city"), caption: "Single · idle" },
  { release: release("kaizen"), caption: "Single · playing", playing: { trackId: "kaizen", state: "playing", elapsed: 9 } },
  { release: release("forever"), caption: "Single · played", playing: { trackId: "forever", state: "played", elapsed: 30 } },
  {
    release: release("bring-that-change"),
    caption: "Single · loading (proposal)",
    playing: { trackId: "bring-that-change", state: "loading", elapsed: 0 },
  },
  { release: release("edit-x"), caption: "Edit single · EDIT tag" },
  { release: release("remix-x"), caption: "Remix single · REMIX tag, playing", playing: { trackId: "remix-x", state: "playing", elapsed: 21 } },
  { release: release("cant-you-see-ep"), caption: "EP · collapsed" },
  {
    release: release("cant-you-see-ep"),
    caption: "EP · expanded, UKG 333 playing",
    expanded: true,
    playing: { trackId: "ukg-333", state: "playing", elapsed: 12 },
  },
  { release: ALBUM, caption: "Album · collapsed" },
  {
    release: { ...release("forever"), id: "long", title: "You who could be Forever (Extended Night Drive Version)" },
    caption: "Single · a long title",
  },
];

// Each variant in its four states, on the surface it sits on: nested rows
// under an expanded release, on the page's backdrop, and the hero's list
// rows under their hairline, with LEAD on the lead track.
export function DiscographySection() {
  const tracks = ALBUM.tracks.slice(0, STATES.length);

  return (
    <section className={styles.section} aria-labelledby="discography">
      <h2 id="discography" className={styles.heading}>Discography</h2>
      <div className={styles.blocks}>
        <section aria-labelledby="discography-filter">
          <h3 id="discography-filter" className={`${styles.label} ${styles.blockHeading}`}>Release filter</h3>
          <div className={styles.rows}>
            <FilterBench releases={FIXTURE_RELEASES} caption="Closed · All releases" />
            <FilterBench releases={FIXTURE_RELEASES} initial="single" defaultOpen caption="Open · Singles ticked (phone)" />
            <FilterBench releases={FIXTURE_RELEASES} initial="ep" caption="One type selected · EPs" />
            <FilterBench releases={NO_ALBUMS} caption="No albums · Albums left out" />
          </div>
        </section>
        <section aria-labelledby="discography-releases">
          <h3 id="discography-releases" className={`${styles.label} ${styles.blockHeading}`}>Release rows</h3>
          <ul className={styles.rows}>
            {RELEASE_STATES.map(({ release: r, caption, expanded, playing }) => (
              <li key={caption} className={styles.stack}>
                <div className={styles.trackGroup}>
                  <ReleaseRow
                    release={r}
                    expanded={expanded}
                    playingTrackId={playing?.trackId}
                    playState={playing?.state}
                    elapsed={playing?.elapsed}
                  />
                </div>
                <span className={styles.cap}>{caption}</span>
              </li>
            ))}
          </ul>
        </section>
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
