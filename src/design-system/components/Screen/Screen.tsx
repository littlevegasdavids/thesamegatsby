import type { ReactNode } from "react";
import styles from "./Screen.module.css";

// The frame around every page: the ground, safe-area padding, the grid
// backdrop behind the content, and the grain and vignette layer over it. The
// root layout renders it once.
export function Screen({ children }: { children: ReactNode }) {
  return (
    <div className={styles.screen}>
      <div className={`${styles.backdrop} dg-backdrop`} aria-hidden="true" />
      {children}
      <div className={`${styles.texture} dg-vignette dg-grain`} aria-hidden="true" />
    </div>
  );
}
