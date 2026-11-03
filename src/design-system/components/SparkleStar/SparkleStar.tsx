import styles from "./SparkleStar.module.css";
import { STAR_PATH, STAR_VIEWBOX, starA11y } from "./star";

type SparkleStarProps = {
  /** Width and height, in px. */
  size: number;
  twinkle?: boolean;
  /** Names the star for assistive tech. Without one it's decorative. */
  label?: string;
};

// The signature mark: it means "this one", so it marks the active thing.
export function SparkleStar({ size, twinkle = false, label }: SparkleStarProps) {
  return (
    <svg
      className={twinkle ? `${styles.star} ${styles.twinkle}` : styles.star}
      width={size}
      height={size}
      viewBox={STAR_VIEWBOX}
      {...starA11y(label)}
    >
      <path d={STAR_PATH} fill="currentColor" />
    </svg>
  );
}
