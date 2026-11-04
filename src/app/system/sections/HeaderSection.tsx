import Image from "next/image";
// From its own file, not index.ts: through the barrel, the build put
// /system's CSS in the chunk / loads.
import { SiteHeader } from "../../../design-system/components/SiteHeader/SiteHeader";
import { FIXTURE_RELEASES, FIXTURE_SOCIALS } from "../fixtures";
import { SystemFrame } from "../SystemFrame";
import styles from "../system.module.css";

const FRAME_H = 420;
// Far enough that the first cover is under the header.
const MID_SCROLL = 360;

const STATES = [
  { variant: "floating", scrollTop: 0, caption: "Floating · at the top" },
  { variant: "floating", scrollTop: MID_SCROLL, caption: "Floating · mid-scroll, the covers and grid behind the glass" },
  { variant: "bar", scrollTop: 0, caption: "Bar · at the top" },
  { variant: "bar", scrollTop: MID_SCROLL, caption: "Bar · mid-scroll" },
] as const;

// Each variant at the top and mid-scroll, in a frame that scrolls on its own
// with its own drifting grid. Below the header, a stand-in page of the
// fixture's covers gives the glass something to scroll over. The covers load
// eagerly: they're fluid, so a lazy load with no fixed size draws a DevTools
// warning, and the frames need them in place to scroll over. From 768 px the
// floating header sits in the page's container, as on the desktop board,
// and the bar spans the screen, since it's full width.
export function HeaderSection() {
  return (
    <section className={styles.section} aria-labelledby="header">
      <h2 id="header" className={styles.heading}>Header</h2>
      <ul className={`${styles.rows} ${styles.frames}`}>
        {STATES.map(({ variant, scrollTop, caption }) => (
          <li key={caption} className={styles.stack}>
            <SystemFrame label={caption} height={FRAME_H} scrollTop={scrollTop}>
              {variant === "bar" && <SiteHeader socials={FIXTURE_SOCIALS} variant="bar" />}
              <div className={styles.framePage}>
                {variant === "floating" && <SiteHeader socials={FIXTURE_SOCIALS} variant="floating" />}
                <ol className={styles.frameContent}>
                  {FIXTURE_RELEASES.map((release) => (
                    <li key={release.id} className={styles.frameItem}>
                      <Image src={release.cover} alt="" width={320} height={320} loading="eager" className={styles.frameCover} />
                      <span className={styles.name}>{release.title}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </SystemFrame>
            <span className={styles.cap}>{caption}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
