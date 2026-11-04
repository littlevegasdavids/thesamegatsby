// From its own file, not index.ts: through the barrel, the build put
// /system's CSS in the chunk / loads.
import { SocialLinks } from "../../../design-system/components/SocialLinks/SocialLinks";
import { StreamLinks } from "../../../design-system/components/StreamLinks/StreamLinks";
import type { Release } from "../../../design-system/types";
import { FIXTURE_RELEASES, FIXTURE_SOCIALS } from "../fixtures";
import styles from "../system.module.css";

const release = (id: string): Release => {
  const found = FIXTURE_RELEASES.find((r) => r.id === id);
  if (!found) throw new Error(`No fixture release ${id}`);
  return found;
};

// The five main platforms only, all eight, and one of the five missing.
const FIVE = release("vapor-city").links;
const EIGHT = release("album-x").links;
const FOUR = release("kaizen").links.filter((link) => link.platform !== "youtube-music");

// Each state the spec lists. The bar samples sit on the now-playing bar's
// surface, which runs to the screen's edges on a phone as the bar does, so
// the five columns get the bar's real width. The header rows sit on the
// header's glass.
export function LinksSection() {
  return (
    <section className={styles.section} aria-labelledby="links">
      <h2 id="links" className={styles.heading}>Links</h2>
      <div className={styles.blocks}>
        <section aria-labelledby="links-stream">
          <h3 id="links-stream" className={`${styles.label} ${styles.blockHeading}`}>Stream links</h3>
          <ul className={styles.rows}>
            <li className={styles.stack}>
              <div className={styles.barStrip}>
                <StreamLinks variant="bar" heading="Stream full track" links={FIVE} />
              </div>
              <span className={styles.cap}>Bar · the five main platforms only · no More</span>
            </li>
            <li className={styles.stack}>
              <div className={styles.barStrip}>
                <StreamLinks variant="bar" heading="Stream full track" links={EIGHT} />
              </div>
              <span className={styles.cap}>Bar · all eight · More closed</span>
            </li>
            <li className={styles.stack}>
              <div className={styles.barStrip}>
                <StreamLinks variant="bar" heading="Stream full track" links={EIGHT} defaultOpen />
              </div>
              <span className={styles.cap}>Bar · all eight · More open</span>
            </li>
            <li className={styles.stack}>
              <div className={styles.barStrip}>
                <StreamLinks variant="bar" heading="Stream full track" links={FOUR} />
              </div>
              <span className={styles.cap}>Bar · YouTube Music missing · left out, not disabled</span>
            </li>
            <li className={styles.stack}>
              <div className={styles.barStrip}>
                <StreamLinks variant="bar" heading="Hear the full track" links={EIGHT} emphasis />
              </div>
              <span className={styles.cap}>Bar · emphasised · the ended state</span>
            </li>
            <li className={styles.stack}>
              <StreamLinks variant="chips" heading="Stream it on" links={FIVE} />
              <span className={styles.cap}>Chips · the five only</span>
            </li>
            <li className={styles.stack}>
              <StreamLinks variant="chips" heading="Stream the EP" links={EIGHT} />
              <span className={styles.cap}>Chips · all eight · More closed</span>
            </li>
            <li className={styles.stack}>
              <StreamLinks variant="chips" heading="Stream the album" links={EIGHT} defaultOpen />
              <span className={styles.cap}>Chips · all eight · More open, the extras after it</span>
            </li>
          </ul>
        </section>

        <section aria-labelledby="links-social">
          <h3 id="links-social" className={`${styles.label} ${styles.blockHeading}`}>Social links</h3>
          <ul className={styles.rows}>
            <li className={styles.stack}>
              <div className={`dg-glass ${styles.headerRow}`}>
                <SocialLinks variant="icons" links={FIXTURE_SOCIALS} />
              </div>
              <span className={styles.cap}>Icons · the phone header row · 44 px targets</span>
            </li>
            <li className={styles.stack}>
              <div className={`dg-glass ${styles.headerRow}`}>
                <SocialLinks variant="handles" links={FIXTURE_SOCIALS} />
              </div>
              <span className={styles.cap}>Handles · the desktop header row</span>
            </li>
            <li className={styles.stack}>
              <SocialLinks variant="footer" links={FIXTURE_SOCIALS} />
              <span className={styles.cap}>Footer · the phone&rsquo;s Follow the signal block</span>
            </li>
          </ul>
        </section>
      </div>
    </section>
  );
}
