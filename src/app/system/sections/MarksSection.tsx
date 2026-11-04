import { statSync } from "node:fs";
import { join } from "node:path";
import Image from "next/image";
// From its own file, not index.ts: through the barrel, which also exports
// Screen, the build put /system's CSS in the chunk / loads.
import { SparkleStar } from "../../../design-system/components/SparkleStar/SparkleStar";
import { Wordmark } from "../../../design-system/components/Wordmark/Wordmark";
import starFile from "../../../design-system/assets/sparkle-star.svg";
import wordmarkFile from "../../../design-system/assets/wordmark.svg";
import styles from "../system.module.css";

const SIZES = [56, 28, 14] as const;

// The artwork tone is for setting the mark on a cover, as this one sets it.
const STAGE_COVER = "/system-fixtures/give-me-that-kaizen.jpg";

const bytes = (asset: string) => statSync(join(process.cwd(), "src/design-system/assets", asset)).size;

// The star and the wordmark in each state the spec lists, the star at the
// style tile's motif-row sizes. The files' sizes are read at build time, like
// the token values.
export function MarksSection() {
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
              <span className={styles.cap}>The file · signal yellow baked in · {bytes("sparkle-star.svg")} B</span>
              <code className={styles.code}>assets/sparkle-star.svg</code>
            </li>
          </ul>
        </section>

        <section aria-labelledby="marks-wordmark">
          <h3 id="marks-wordmark" className={`${styles.label} ${styles.blockHeading}`}>Wordmark</h3>
          <ul className={styles.rows}>
            <li className={styles.stack}>
              <Wordmark size="xl" />
              <span className={styles.cap}>xl · 30 to 72 px · V5 stacked tape</span>
              <code className={styles.code}>--dg-text-display-xl · --dg-tape</code>
            </li>
            <li className={styles.stack}>
              <Wordmark size="l" />
              <span className={styles.cap}>l · 28 to 36 px · the header and footer</span>
              <code className={styles.code}>--dg-text-display-l</code>
            </li>
            <li className={styles.stack}>
              <span className={styles.artworkStage}>
                <Image src={STAGE_COVER} alt="" fill sizes="30rem" className={styles.stageCover} />
                <span className={styles.stageMark}>
                  <Wordmark size="xl" tone="artwork" />
                </span>
              </span>
              <span className={styles.cap}>Artwork · V7 · white on a black drop · on the KaiZen cover</span>
              <code className={styles.code}>--dg-tape-artwork</code>
            </li>
            <li className={styles.stack}>
              <Image src={wordmarkFile} alt="" className={styles.file} />
              <span className={styles.cap}>The file · screen tone baked in · {bytes("wordmark.svg")} B</span>
              <code className={styles.code}>assets/wordmark.svg</code>
            </li>
          </ul>
        </section>
      </div>
    </section>
  );
}
