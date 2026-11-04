"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import type { StreamLink } from "../../types";
import { Button } from "../Button/Button";
import { ProgressTape } from "../ProgressTape/ProgressTape";
import { StreamLinks } from "../StreamLinks/StreamLinks";
import { VhsReadout } from "../VhsReadout/VhsReadout";
import styles from "./NowPlayingBar.module.css";
import { nowPlayingView, type NowPlayingState } from "./view";

export type NowPlayingTrack = { title: string; cover: string };

type NowPlayingBarProps = {
  track: NowPlayingTrack;
  state: NowPlayingState;
  /** Seconds played, and the snippet's length. */
  elapsed: number;
  duration: number;
  onStop?: () => void;
  onReplay?: () => void;
  onClose?: () => void;
  /** The track's own links, which site passes once the catalogue has them. */
  streamLinks: readonly StreamLink[];
  /** Opens "More" on first render, so /system can show it open. */
  defaultMoreOpen?: boolean;
};

// The player, fixed to the bottom of the screen: the tape along its top, the
// track with its readout and controls, and the way out to the full song.
// It's placed at the end of the page. The spacer it leaves there is as tall
// as the bar, so the last content scrolls clear of it, and it publishes that
// height as --dg-bar-h on its scroll container, which pads its bottom by it,
// so Tab never leaves focus behind the bar. Both follow the bar as it grows,
// when "More" opens or the links wrap.
export function NowPlayingBar({
  track,
  state,
  elapsed,
  duration,
  onStop,
  onReplay,
  onClose,
  streamLinks,
  defaultMoreOpen,
}: NowPlayingBarProps) {
  const bar = useRef<HTMLElement>(null);
  const view = nowPlayingView(state, track.title, elapsed, duration);

  useEffect(() => {
    const el = bar.current;
    if (!el) return;
    const root = scrollRoot(el);
    const publish = (height: number) => root.style.setProperty("--dg-bar-h", `${Math.ceil(height)}px`);
    // Now, before a parent's effect scrolls the page, and again on every
    // change of size.
    publish(el.getBoundingClientRect().height);
    const observer = new ResizeObserver(([entry]) => publish(entry.borderBoxSize[0]?.blockSize ?? el.getBoundingClientRect().height));
    observer.observe(el);
    return () => {
      observer.disconnect();
      root.style.removeProperty("--dg-bar-h");
    };
  }, []);

  return (
    <>
      <div className={styles.spacer} aria-hidden />
      <section ref={bar} className={styles.bar} aria-label="Now playing">
        <ProgressTape ratio={view.ratio} />
        <div className={`${styles.scan} dg-scanlines`} aria-hidden />
        <div className={styles.content}>
          <div className={styles.track}>
            <Image className={styles.cover} src={track.cover} alt="" width={56} height={56} />
            <div className={styles.text}>
              <span className={styles.title}>{track.title}</span>
              <VhsReadout mode={view.mode} elapsed={elapsed} duration={duration} />
            </div>
            <div className={styles.controls}>
              <Button
                variant="hardware"
                icon={view.control.icon}
                label={view.control.label}
                onClick={view.close ? onReplay : onStop}
              />
              {view.close && <Button variant="hardware" icon="close" label="Close player" onClick={onClose} />}
            </div>
          </div>
          <div className={styles.streams}>
            <StreamLinks
              variant="bar"
              heading={view.heading}
              emphasis={view.emphasis}
              links={streamLinks}
              defaultOpen={defaultMoreOpen}
            />
          </div>
          <p className={styles.announce} aria-live="polite">
            {view.announce}
          </p>
        </div>
      </section>
    </>
  );
}

// The nearest ancestor that scrolls, or the page itself: where focus has to
// clear the bar.
function scrollRoot(el: HTMLElement): HTMLElement {
  for (let node = el.parentElement; node; node = node.parentElement) {
    if (/^(?:auto|scroll)$/.test(getComputedStyle(node).overflowY)) return node;
  }
  return document.documentElement;
}
