// From its own file, not index.ts: through the barrel, the build put
// /system's CSS in the chunk / loads.
import { ReleaseHero } from "../../../design-system/components/ReleaseHero/ReleaseHero";
import type { PlayState } from "../../../design-system/components/ReleaseRow/view";
import type { Release } from "../../../design-system/types";
import { FIXTURE_RELEASES } from "../fixtures";
import styles from "../system.module.css";

const release = (id: string): Release => {
  const found = FIXTURE_RELEASES.find((r) => r.id === id);
  if (!found) throw new Error(`No fixture release ${id}`);
  return found;
};

const SINGLE = release("vapor-city");
const EP = release("cant-you-see-ep");
// LEAD on the third track, as PhoneHeroAlbum.dc.html and DesktopHeroes.dc.html
// draw it.
const ALBUM = { ...release("album-x"), leadTrackId: "album-x-3" };

// Every hero state the spec lists, one hero each: what's playing is set per
// hero, so the states sit one after another.
const HEROES: readonly {
  release: Release;
  caption: string;
  showAll?: boolean;
  playing?: { trackId: string; state: PlayState; elapsed: number };
}[] = [
  { release: SINGLE, caption: "Single · idle" },
  {
    release: SINGLE,
    caption: "Single · playing: Stop snippet, pressed (G7)",
    playing: { trackId: "vapor-city", state: "playing", elapsed: 12 },
  },
  { release: EP, caption: "EP · idle, every track listed" },
  {
    release: EP,
    caption: "EP · lead track playing: its row lit, Stop snippet pressed (G7)",
    playing: { trackId: "cant-you-see", state: "playing", elapsed: 12 },
  },
  {
    release: EP,
    caption: "EP · UKG 333 played: Play lead track again",
    playing: { trackId: "ukg-333", state: "played", elapsed: 30 },
  },
  { release: ALBUM, caption: "Album · first five, Show all 8 tracks" },
  {
    release: ALBUM,
    caption: "Album · Show all open, reading Show fewer tracks, track 7 loading",
    showAll: true,
    playing: { trackId: "album-x-7", state: "loading", elapsed: 0 },
  },
  {
    release: { ...release("forever"), id: "long", title: "You who could be Forever (Extended Night Drive Version)" },
    caption: "Single · a long title",
  },
];

// The heroes at the width a page gives them: the desktop boards' 1120 px
// container, and on a phone the boards' 20 px from the screen's edges.
export function HeroSection() {
  return (
    <section className={styles.section} aria-labelledby="hero">
      <h2 id="hero" className={styles.heading}>Hero</h2>
      <ul className={styles.heroes}>
        {HEROES.map(({ release: r, caption, showAll, playing }) => (
          <li key={caption} className={styles.heroItem}>
            <span className={styles.cap}>{caption}</span>
            <ReleaseHero
              release={r}
              playingTrackId={playing?.trackId}
              playState={playing?.state}
              elapsed={playing?.elapsed}
              defaultShowAll={showAll}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
