// From their own files, not index.ts: through the barrel, the build put
// /system's CSS in the chunk / loads.
import { NowPlayingBar } from "../../../design-system/components/NowPlayingBar/NowPlayingBar";
import type { NowPlayingState } from "../../../design-system/components/NowPlayingBar/view";
import { MORE_PLATFORMS } from "../../../design-system/platforms";
import type { Release, StreamLink } from "../../../design-system/types";
import { FIXTURE_RELEASES } from "../fixtures";
import { SystemFrame } from "../SystemFrame";
import styles from "../system.module.css";

const release = (id: string): Release => {
  const found = FIXTURE_RELEASES.find((r) => r.id === id);
  if (!found) throw new Error(`No fixture release ${id}`);
  return found;
};

const KAIZEN = release("kaizen");
// KaiZen's five, plus the bracketed album's three extras, so "More" shows.
const WITH_MORE: readonly StreamLink[] = [
  ...KAIZEN.links,
  ...release("album-x").links.filter(({ platform }) => (MORE_PLATFORMS as readonly string[]).includes(platform)),
];

const FRAME_H = 560;
// Past the end: the frame holds it at the bottom, to show the last of the
// page clear of the bar.
const BOTTOM = 100_000;

// The bar boards' states, KaiZen as they draw it: 12 of 30 while playing,
// 18 with More open, and the end.
const STATES: readonly {
  state: NowPlayingState;
  elapsed: number;
  links: readonly StreamLink[];
  moreOpen?: boolean;
  title?: string;
  caption: string;
}[] = [
  { state: "loading", elapsed: 0, links: KAIZEN.links, caption: "Loading (proposal) · LOAD, the tape at 0, Stop" },
  { state: "playing", elapsed: 12, links: KAIZEN.links, caption: "Playing · PLAY 00:12, the tape at 0.4" },
  { state: "ended", elapsed: 30, links: KAIZEN.links, caption: "Ended · END, Replay and Close, Hear the full track, emphasised" },
  { state: "playing", elapsed: 18, links: WITH_MORE, moreOpen: true, caption: "More open · the three extras under the five" },
  {
    state: "playing",
    elapsed: 9,
    links: WITH_MORE,
    title: "You who could be Forever (Extended Night Drive Version)",
    caption: "A long title · it truncates before the readout's line",
  },
];

// The bar in each state, fixed to the bottom of a frame that starts scrolled
// to its end, so the last of the stand-in page shows clear of the bar.
export function PlayerSection() {
  return (
    <section className={styles.section} aria-labelledby="player">
      <h2 id="player" className={styles.heading}>Now playing</h2>
      <ul className={`${styles.rows} ${styles.frames}`}>
        {STATES.map(({ state, elapsed, links, moreOpen, title, caption }) => (
          <li key={caption} className={styles.stack}>
            <SystemFrame label={caption} height={FRAME_H} scrollTop={BOTTOM}>
              <div className={styles.framePage}>
                <ol className={styles.playerPage}>
                  {FIXTURE_RELEASES.map((r) => (
                    <li key={r.id} className={styles.name}>
                      {r.title}
                    </li>
                  ))}
                  <li className={styles.playerEnd}>The end of the page</li>
                </ol>
                <NowPlayingBar
                  track={{ title: title ?? KAIZEN.title, cover: KAIZEN.cover }}
                  state={state}
                  elapsed={elapsed}
                  duration={30}
                  streamLinks={links}
                  defaultMoreOpen={moreOpen}
                />
              </div>
            </SystemFrame>
            <span className={styles.cap}>{caption}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
