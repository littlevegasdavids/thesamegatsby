"use client";

import { useId, useState } from "react";
import { PlatformIcon } from "../../assets/icons";
import { PLATFORMS, splitLinks } from "../../platforms";
import type { StreamLink } from "../../types";
import { SparkleStar } from "../SparkleStar/SparkleStar";
import styles from "./StreamLinks.module.css";

type StreamLinksProps = {
  links: readonly StreamLink[];
  heading: string;
  /** Opens "More" on first render, so /system can show it open. */
  defaultOpen?: boolean;
} & ({ variant: "bar"; emphasis?: boolean } | { variant: "chips"; emphasis?: never });

// Where a fan leaves to stream the full song: the five main platforms as
// equal buttons, and the extras one tap away behind "More". The toggle comes
// after the five in the source, so the extras it opens are the next stops,
// and CSS lifts it onto the heading row in the phone bar.
export function StreamLinks({ links, heading, variant, emphasis = false, defaultOpen = false }: StreamLinksProps) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();
  const { main, more } = splitLinks(links);
  if (main.length + more.length === 0) return null;

  const headingId = `${id}-heading`;
  const moreIds = more.map((link) => `${id}-${link.platform}`);
  const toggle = more.length > 0 && (
    <button
      type="button"
      className={styles.toggle}
      aria-expanded={open}
      aria-controls={variant === "bar" ? `${id}-more` : moreIds.join(" ")}
      onClick={() => setOpen((was) => !was)}
    >
      {open ? "Less" : "More"}
      <svg className={open ? `${styles.chevron} ${styles.open}` : styles.chevron} width={14} height={14} viewBox="0 0 24 24" aria-hidden>
        <path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );

  const anchor = (link: StreamLink, icon: boolean) => {
    const { label, short } = PLATFORMS[link.platform];
    return (
      <a className={styles.link} href={link.url} target="_blank" rel="noopener" aria-label={label}>
        {icon && <PlatformIcon icon={link.platform} size={22} />}
        {icon && short !== label ? (
          <>
            <span className={styles.short}>{short}</span>
            <span className={styles.full}>{label}</span>
          </>
        ) : (
          label
        )}
      </a>
    );
  };

  const headingText = (
    <p id={headingId} className={styles.heading}>
      {emphasis && <SparkleStar size={12} />}
      {heading}
    </p>
  );

  if (variant === "chips") {
    return (
      <div role="group" aria-labelledby={headingId} className={styles.chips}>
        {headingText}
        <ul className={styles.chipList}>
          {main.map((link) => (
            <li key={link.platform}>{anchor(link, false)}</li>
          ))}
          {toggle && <li>{toggle}</li>}
          {more.map((link, i) => (
            <li key={link.platform} id={moreIds[i]} hidden={!open}>
              {anchor(link, false)}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div role="group" aria-labelledby={headingId} className={emphasis ? `${styles.bar} ${styles.emphasis}` : styles.bar}>
      {headingText}
      <ul className={styles.main}>
        {main.map((link) => (
          <li key={link.platform}>{anchor(link, true)}</li>
        ))}
      </ul>
      {toggle}
      {more.length > 0 && (
        <ul id={`${id}-more`} className={styles.more} hidden={!open}>
          {more.map((link) => (
            <li key={link.platform}>{anchor(link, true)}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
