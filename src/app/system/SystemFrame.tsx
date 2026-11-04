"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import styles from "./SystemFrame.module.css";

// A screen inside /system: a fixed-height box that scrolls on its own, so a
// sticky or fixed component can be shown in place, one frame per state,
// instead of piling up at the top or bottom of the bench. The outer box
// contains layout and paint, which makes it the containing block for fixed
// children, and doesn't scroll, so they stay put. The inner box scrolls, and
// a sticky child sticks to it. Each frame has its own drifting grid.
export function SystemFrame({
  label,
  height,
  scrollTop = 0,
  children,
}: {
  label: string;
  height: number;
  /** Where the frame starts, in px, to show a mid-scroll state. */
  scrollTop?: number;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scroller = ref.current;
    if (scroller) scroller.scrollTop = scrollTop;
  }, [scrollTop]);

  return (
    <div className={styles.frame} style={{ "--frame-h": `${height}px` } as CSSProperties}>
      <div className={`${styles.backdrop} dg-backdrop`} aria-hidden="true" />
      <div ref={ref} className={styles.scroller} tabIndex={0} role="region" aria-label={label}>
        {children}
      </div>
    </div>
  );
}
