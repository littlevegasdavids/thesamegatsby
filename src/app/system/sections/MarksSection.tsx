import { statSync } from "node:fs";
import { join } from "node:path";
import Image from "next/image";
// From its own file, not index.ts: through the barrel, which also exports
// Screen, the build put /system's CSS in the chunk / loads.
import { SparkleStar } from "../../../design-system/components/SparkleStar/SparkleStar";
import starFile from "../../../design-system/assets/sparkle-star.svg";
import styles from "../system.module.css";

const SIZES = [56, 28, 14] as const;

// The star in each state the spec lists, at the style tile's motif-row sizes.
// The file's size is read at build time, like the token values.
export function MarksSection() {
  const fileBytes = statSync(join(process.cwd(), "src/design-system/assets/sparkle-star.svg")).size;

  return (
    <section className={styles.section} aria-labelledby="marks">
      <h2 id="marks" className={styles.heading}>Marks</h2>
      <div className={styles.blocks}>
        <section aria-labelledby="marks-star">
          <h3 id="marks-star" className={`${styles.label} ${styles.blockHeading}`}>Sparkle star</h3>
          <ul className={styles.rows}>
            <li className={styles.stack}>
              <span className={styles.marks}>
                {SIZES.map((size, i) => (
                  <SparkleStar key={size} size={size} label={i === 0 ? "Sparkle star" : undefined} />
                ))}
              </span>
              <span className={styles.cap}>Static · 56, 28 and 14 px · the first labelled</span>
              <code className={styles.code}>--dg-star</code>
            </li>
            <li className={styles.stack}>
              <span className={styles.marks}>
                {SIZES.map((size) => (
                  <SparkleStar key={size} size={size} twinkle />
                ))}
              </span>
              <span className={styles.cap}>Twinkle · in steps · still under reduced motion</span>
              <code className={styles.code}>--dg-dur-1</code>
            </li>
            <li className={styles.stack}>
              <p className={`${styles.label} ${styles.heroLabel}`}>
                <SparkleStar size={12} />
                New EP · 2 tracks
              </p>
              <span className={styles.cap}>Amber in the hero label</span>
              <code className={styles.code}>--dg-star: var(--dg-accent)</code>
            </li>
            <li className={styles.stack}>
              <Image src={starFile} alt="" width={56} height={56} />
              <span className={styles.cap}>The file · signal yellow baked in · {fileBytes} B</span>
              <code className={styles.code}>assets/sparkle-star.svg</code>
            </li>
          </ul>
        </section>
      </div>
    </section>
  );
}
