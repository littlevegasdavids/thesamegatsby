import type { ReactNode } from "react";
import styles from "./Screen.module.css";

// The frame around every page: the ground, safe-area padding, and the grain
// and vignette layer. The root layout renders it once.
export function Screen({ children }: { children: ReactNode }) {
  return (
    <div className={styles.screen}>
      {children}
      <div className={`${styles.texture} dg-vignette dg-grain`} aria-hidden="true" />
    </div>
  );
}
