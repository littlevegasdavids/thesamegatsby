import { useId } from "react";
import styles from "./Wordmark.module.css";
import { WORDMARK_PATH, WORDMARK_SVG, WORDMARK_TONES, type WordmarkTone } from "./outline";

type WordmarkProps = {
  /** xl takes --dg-text-display-xl, l takes --dg-text-display-l. */
  size: "xl" | "l";
  /** artwork is white on a black drop, for covers and posts. */
  tone?: WordmarkTone;
};

// "Déjà Gatsby" as outlines: one path, drawn once per copy of the tone. The
// id is per instance, so a header and footer wordmark don't share one.
export function Wordmark({ size, tone = "screen" }: WordmarkProps) {
  const id = useId();

  return (
    <svg className={`${styles.wordmark} ${styles[size]}`} {...WORDMARK_SVG}>
      <defs>
        <path id={id} d={WORDMARK_PATH} />
      </defs>
      {WORDMARK_TONES[tone].map(({ x, y, fill }) => (
        <use key={fill} href={`#${id}`} x={x} y={y} className={styles[fill]} />
      ))}
    </svg>
  );
}
