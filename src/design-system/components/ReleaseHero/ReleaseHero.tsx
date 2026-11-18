import { getImageProps } from "next/image";
import { useId } from "react";
import type { Release } from "../../types";
import { Button } from "../Button/Button";
import type { PlayState } from "../ReleaseRow/view";
import { SparkleStar } from "../SparkleStar/SparkleStar";
import { StreamLinks } from "../StreamLinks/StreamLinks";
import { HeroTracklist } from "./HeroTracklist";
import styles from "./ReleaseHero.module.css";
import { phoneCover, releaseHeroView } from "./view";

type ReleaseHeroProps = {
  /** The latest or featured release. Its leadTrackId and links are the hero's. */
  release: Release;
  /** The track playing anywhere on the page, or none. */
  playingTrackId?: string | null;
  playState?: PlayState;
  elapsed?: number;
  /** Plays or stops a track: the lead from the main button, or a listed one. */
  onPlay?: (trackId: string) => void;
  /** Raised on pointerdown and focus of a play control, before a click, with
   * the track it would play. */
  onIntent?: (trackId: string) => void;
  /** Opens an album's "Show all" on first render, so /system can show it open. */
  defaultShowAll?: boolean;
  /** Fetches the cover first. For the page's main hero, which is its largest paint. */
  priority?: boolean;
};

// The top of the page: the release it adapts to, with its cover, its Aero
// title and the way to hear it. A single gets "Play snippet". An EP or album
// gets "Play lead track", its tracklist with LEAD on the lead, and an album's
// tracks past five behind "Show all". Nothing is drawn over the cover. While
// the lead track runs, the main button reads "Stop snippet", pressed (G7).
export function ReleaseHero({ release, playingTrackId, playState, elapsed, onPlay, onIntent, defaultShowAll, priority }: ReleaseHeroProps) {
  const labelId = `${useId()}-label`;
  const view = releaseHeroView(release, { playingTrackId, playState, elapsed });
  const className = `${styles.hero} ${view.kind === "single" ? styles.single : styles.group}`;
  const { props: cover } = getImageProps({
    className: styles.coverImage,
    src: release.cover,
    alt: `${release.title} cover art`,
    width: 480,
    height: 480,
    // The cover's box: the column, 20 px in, on a phone.
    sizes: "(min-width: 768px) 480px, calc(100vw - 40px)",
    loading: "eager",
    fetchPriority: priority ? "high" : undefined,
  });
  const phone = phoneCover(cover.srcSet, cover.src);

  return (
    <section className={className} aria-labelledby={labelId}>
      <p id={labelId} className={styles.label}>
        <SparkleStar size={12} />
        {view.label}
      </p>
      {/* From 768 px the cover is about 44% of the screen, up to 480 px, and the
          browser picks by that and the density. Below it the img offers nothing
          past the phone cap. */}
      <div className={styles.cover}>
        <picture className={styles.coverPicture}>
          <source media="(min-width: 768px)" srcSet={cover.srcSet} sizes="min(44vw, 480px)" />
          <img {...cover} alt={cover.alt} src={phone.src} srcSet={phone.srcSet} />
        </picture>
      </div>
      <div className={styles.body}>
        <h1 className={`${styles.title} dg-tape`}>{release.title}</h1>
        <div className={styles.actions}>
          <Button
            variant="primary"
            icon={view.play.icon}
            label={view.play.label}
            pressed={view.play.pressed}
            onClick={onPlay && (() => onPlay(view.leadTrackId))}
            onIntent={onIntent && (() => onIntent(view.leadTrackId))}
          />
          {view.leadNote && <span className={styles.leadNote}>{view.leadNote}</span>}
        </div>
        {view.listLabel && (
          <HeroTracklist label={view.listLabel} tracks={view.tracks} shown={view.shown} defaultShowAll={defaultShowAll} onPlay={onPlay} onIntent={onIntent} />
        )}
        <div className={styles.streams}>
          <StreamLinks variant="chips" heading={view.streamHeading} links={release.links} />
        </div>
      </div>
    </section>
  );
}
