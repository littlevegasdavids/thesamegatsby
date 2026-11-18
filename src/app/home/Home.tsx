"use client";

import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from "react";
import { createAudioEngine } from "../../audio/engine";
import type { EngineTrack } from "../../audio/tracks";
import { useAudioEngine } from "../../audio/use-audio-engine";
// From their own files, not index.ts: through the barrel, the build put
// /system's CSS in the chunk / loads.
import { NowPlayingBar } from "../../design-system/components/NowPlayingBar/NowPlayingBar";
import { ReleaseFilter } from "../../design-system/components/ReleaseFilter/ReleaseFilter";
import { ReleaseHero } from "../../design-system/components/ReleaseHero/ReleaseHero";
import { ReleaseRow } from "../../design-system/components/ReleaseRow/ReleaseRow";
import { SiteHeader } from "../../design-system/components/SiteHeader/SiteHeader";
import { releaseCategory, releaseFilterOptions, type FilterKey } from "../../design-system/release-filter";
import type { Release, SocialLink } from "../../design-system/types";
import styles from "./home.module.css";
import { barTrack, focusAfterClose, opensElsewhere, pageState, shouldStop } from "./playing";

type HomeProps = {
  releases: readonly Release[];
  heroId: string;
  tracks: readonly EngineTrack[];
  socials: readonly SocialLink[];
  /** The footer, rendered on the server. */
  footer: ReactNode;
};

// Runs the warm-up once the page has loaded and gone idle. Safari has no
// requestIdleCallback, so a timer stands in.
function whenIdle(run: () => void): () => void {
  let cancel = () => {};
  const idle = () => {
    if (typeof window.requestIdleCallback === "function") {
      const handle = window.requestIdleCallback(run);
      cancel = () => window.cancelIdleCallback(handle);
    } else {
      const handle = window.setTimeout(run, 1);
      cancel = () => window.clearTimeout(handle);
    }
  };
  if (document.readyState === "complete") idle();
  else window.addEventListener("load", idle, { once: true });
  return () => {
    window.removeEventListener("load", idle);
    cancel();
  };
}

// The homepage as Main.dc.html and HomeDesktop.dc.html lay it out, with one
// engine behind every play control. The engine makes its element on the
// first tap, so nothing is fetched or played before one but the warm-up.
export function Home({ releases, heroId, tracks, socials, footer }: HomeProps) {
  const [engine] = useState(() => createAudioEngine(tracks));
  const playback = useAudioEngine(engine);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const lastControl = useRef<HTMLElement | null>(null);

  const hero = releases.find(({ id }) => id === heroId) ?? releases[0];
  useEffect(() => whenIdle(() => engine.warm(hero.leadTrackId)), [engine, hero.leadTrackId]);

  const play = (trackId: string) => (shouldStop(engine.getSnapshot(), trackId) ? engine.stop() : engine.play(trackId));
  const intent = (trackId: string) => engine.intent(trackId);
  // Capture, so it runs whatever the link's own handler does.
  const clicked = (event: MouseEvent<HTMLDivElement>) => {
    const target = event.target instanceof Element ? event.target : null;
    if (opensElsewhere(target)) engine.stop();
    lastControl.current = target?.closest<HTMLElement>("main button[aria-pressed]") ?? lastControl.current;
  };
  const close = () => {
    const byKeyboard = document.activeElement?.matches(":focus-visible") ?? false;
    const first = document.querySelector<HTMLElement>("main button[aria-pressed]");
    engine.close();
    focusAfterClose(byKeyboard, lastControl.current, first)?.focus();
  };

  const now = pageState(playback);
  const bar = barTrack(playback, releases);
  const shown = releases.filter((release) => filter === "all" || releaseCategory(release) === filter);

  return (
    <div className={styles.page} onClickCapture={clicked}>
      <SiteHeader socials={socials} variant="floating" />
      <main>
        <div className={styles.hero}>
          <ReleaseHero release={hero} {...now} onPlay={play} onIntent={intent} priority />
        </div>
        <section className={styles.discography} aria-label="Discography">
          <ReleaseFilter options={releaseFilterOptions(releases)} selected={filter} onSelect={setFilter} />
          {shown.map((release) => (
            <ReleaseRow
              key={release.id}
              release={release}
              expanded={!!open[release.id]}
              {...now}
              onToggle={() => setOpen((was) => ({ ...was, [release.id]: !was[release.id] }))}
              onPlay={play}
              onIntent={intent}
            />
          ))}
        </section>
      </main>
      {footer}
      {playback && bar && (
        <NowPlayingBar
          track={bar.track}
          state={bar.state}
          elapsed={playback.elapsed}
          duration={playback.duration}
          streamLinks={bar.links}
          onStop={() => engine.stop()}
          onReplay={() => engine.replay()}
          onClose={close}
        />
      )}
    </div>
  );
}
