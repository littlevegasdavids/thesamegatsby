"use client";

import { useEffect, useRef, useState } from "react";
// From their own files, not index.ts: through the barrel, the build put
// /system's CSS in the chunk / loads.
import { NowPlayingBar } from "../../../design-system/components/NowPlayingBar/NowPlayingBar";
import { ReleaseFilter } from "../../../design-system/components/ReleaseFilter/ReleaseFilter";
import { ReleaseHero } from "../../../design-system/components/ReleaseHero/ReleaseHero";
import { ReleaseRow } from "../../../design-system/components/ReleaseRow/ReleaseRow";
import type { PlayState } from "../../../design-system/components/ReleaseRow/view";
import { SiteHeader } from "../../../design-system/components/SiteHeader/SiteHeader";
import { releaseCategory, releaseFilterOptions, type FilterKey } from "../../../design-system/release-filter";
import { FIXTURE_RELEASES, FIXTURE_SOCIALS } from "../fixtures";
import styles from "../system.module.css";

// Where a frame starts. Offsets depend on the width, so they're measured
// from the page once it's laid out, never written as numbers.
export type StackStart = "top" | "album-stuck" | "hand-off" | "collapsed";

const SNIPPET = 30;
const TICK_MS = 250;

// The hero's release, as Main.dc.html's: the newest single.
const HERO = FIXTURE_RELEASES.find(({ id }) => id === "vapor-city") ?? FIXTURE_RELEASES[0];

// Each track with the release it's on, for the bar's cover and links.
const TRACKS = new Map(FIXTURE_RELEASES.flatMap((release) => release.tracks.map((track) => [track.id, { track, release }] as const)));

// The page as site will put it together: the header, the hero, the filter
// and the discography, with the album and the EP open, and the now-playing
// bar while anything plays, inside a SystemFrame. It holds what site will
// (the filter, which releases are open, and what's playing), so the page
// can be scrolled, filtered, opened and played on a real phone. A tapped
// track counts up for 30 s, then ends: the bar stays up with Replay and
// Close until one is tapped.
export function StickyStack({ start }: { start: StackStart }) {
  const [filter, setFilter] = useState<FilterKey>("all");
  const [open, setOpen] = useState<Record<string, boolean>>(
    start === "collapsed" ? {} : { "album-x": true, "cant-you-see-ep": true },
  );
  const [playing, setPlaying] = useState<{ trackId: string; state: PlayState; elapsed: number } | null>(null);
  const page = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scroller = page.current?.closest<HTMLElement>('[role="region"]');
    const album = page.current?.querySelector<HTMLElement>('[data-release="album-x"]');
    const discography = page.current?.querySelector<HTMLElement>("[data-discography]");
    if (!scroller || !album || !discography || start === "top") return;
    // A frame later, after SystemFrame has set its own starting offset.
    const frame = requestAnimationFrame(() => {
      const offset = (el: Element) => el.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop;
      const row = album.querySelector("button");
      const stuckAt = row ? Number.parseFloat(getComputedStyle(row).top) || 0 : 0;
      const rowHeight = row?.getBoundingClientRect().height ?? 0;
      scroller.scrollTop =
        start === "album-stuck"
          ? offset(album) - stuckAt + rowHeight * 3
          : start === "hand-off"
            ? offset(album) + album.getBoundingClientRect().height - stuckAt - rowHeight / 2
            : offset(discography) + rowHeight * 3;
    });
    return () => cancelAnimationFrame(frame);
  }, [start]);

  // A stand-in for audio-engine: 250 ms steps, as timeupdate fires.
  useEffect(() => {
    if (playing?.state !== "playing") return;
    const timer = setInterval(() => {
      setPlaying((now) => {
        if (!now || now.state !== "playing") return now;
        const elapsed = now.elapsed + TICK_MS / 1000;
        return elapsed >= SNIPPET ? { ...now, state: "played", elapsed: SNIPPET } : { ...now, elapsed };
      });
    }, TICK_MS);
    return () => clearInterval(timer);
  }, [playing?.state]);

  const play = (trackId: string) =>
    setPlaying((now) =>
      now?.trackId === trackId && now.state === "playing" ? null : { trackId, state: "playing", elapsed: 0 },
    );

  const shown = FIXTURE_RELEASES.filter((r) => filter === "all" || releaseCategory(r) === filter);
  const current = playing && TRACKS.get(playing.trackId);

  return (
    <div ref={page} className={styles.framePage}>
      <SiteHeader socials={FIXTURE_SOCIALS} variant="floating" />
      <div className={styles.stackHero}>
        <ReleaseHero
          release={HERO}
          playingTrackId={playing?.trackId}
          playState={playing?.state}
          elapsed={playing?.elapsed}
          onPlay={play}
        />
      </div>
      <section data-discography className={styles.stackDiscography} aria-label="Discography">
        <ReleaseFilter options={releaseFilterOptions(FIXTURE_RELEASES)} selected={filter} onSelect={setFilter} />
        {shown.map((release) => (
          <div key={release.id} data-release={release.id}>
            <ReleaseRow
              release={release}
              expanded={!!open[release.id]}
              playingTrackId={playing?.trackId}
              playState={playing?.state}
              elapsed={playing?.elapsed}
              onToggle={() => setOpen((was) => ({ ...was, [release.id]: !was[release.id] }))}
              onPlay={play}
            />
          </div>
        ))}
      </section>
      <p className={`${styles.cap} ${styles.stackEnd}`}>The footer follows the discography.</p>
      {playing && current && (
        <NowPlayingBar
          track={{ title: current.track.title, cover: current.release.cover }}
          state={playing.state === "played" ? "ended" : playing.state}
          elapsed={playing.elapsed}
          duration={current.track.duration}
          streamLinks={current.release.links}
          onStop={() => setPlaying(null)}
          onReplay={() => setPlaying({ trackId: playing.trackId, state: "playing", elapsed: 0 })}
          onClose={() => setPlaying(null)}
        />
      )}
    </div>
  );
}
