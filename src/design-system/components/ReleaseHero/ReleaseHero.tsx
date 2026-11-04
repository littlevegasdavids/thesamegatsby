import Image from "next/image";
import { useId } from "react";
import type { Release } from "../../types";
import { Button } from "../Button/Button";
import type { PlayState } from "../ReleaseRow/view";
import { SparkleStar } from "../SparkleStar/SparkleStar";
import { StreamLinks } from "../StreamLinks/StreamLinks";
import { HeroTracklist } from "./HeroTracklist";
import styles from "./ReleaseHero.module.css";
import { releaseHeroView } from "./view";

type ReleaseHeroProps = {
  /** The latest or featured release. Its leadTrackId and links are the hero's. */
  release: Release;
  /** The track playing anywhere on the page, or none. */
  playingTrackId?: string | null;
  playState?: PlayState;
  elapsed?: number;
  /** Plays or stops a track: the lead from the main button, or a listed one. */
  onPlay?: (trackId: string) => void;
  /** Opens an album's "Show all" on first render, so /system can show it open. */
  defaultShowAll?: boolean;
};

// The top of the page: the release it adapts to, with its cover, its Aero
// title and the way to hear it. A single gets "Play snippet". An EP or album
// gets "Play lead track", its tracklist with LEAD on the lead, and an album's
// tracks past five behind "Show all". Nothing is drawn over the cover. While
// the lead track runs, the main button reads "Stop snippet", pressed (G7).
export function ReleaseHero({ release, playingTrackId, playState, elapsed, onPlay, defaultShowAll }: ReleaseHeroProps) {
  const labelId = `${useId()}-label`;
  const view = releaseHeroView(release, { playingTrackId, playState, elapsed });
  const className = `${styles.hero} ${view.kind === "single" ? styles.single : styles.group}`;

  return (
    <section className={className} aria-labelledby={labelId}>
      <p id={labelId} className={styles.label}>
        <SparkleStar size={12} />
        {view.label}
      </p>
      <div className={styles.cover}>
        <Image className={styles.coverImage} src={release.cover} alt={`${release.title} cover art`} width={480} height={480} loading="eager" />
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
          />
          {view.leadNote && <span className={styles.leadNote}>{view.leadNote}</span>}
        </div>
        {view.listLabel && (
          <HeroTracklist label={view.listLabel} tracks={view.tracks} shown={view.shown} defaultShowAll={defaultShowAll} onPlay={onPlay} />
        )}
        <div className={styles.streams}>
          <StreamLinks variant="chips" heading={view.streamHeading} links={release.links} />
        </div>
      </div>
    </section>
  );
}
