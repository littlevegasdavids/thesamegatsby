import { SocialLinks } from "../../design-system/components/SocialLinks/SocialLinks";
import { SparkleStar } from "../../design-system/components/SparkleStar/SparkleStar";
import { Wordmark } from "../../design-system/components/Wordmark/Wordmark";
import type { SocialLink } from "../../design-system/types";
import styles from "./home.module.css";

const EMAIL = "thesamegatsby@gmail.com";

// The footer as both boards draw it. On a phone: the socials under "Follow
// the signal", then the sign-off. From 768 px the header carries the
// socials, so the footer is the wordmark and sign-off on the left and the
// readout on the right. Both shapes render and CSS shows one.
export function Footer({ socials, year }: { socials: readonly SocialLink[]; year: number }) {
  return (
    <footer className={styles.footer}>
      <div className={styles.phoneOnly}>
        <SocialLinks variant="footer" links={socials} />
      </div>
      <div className={styles.signOff}>
        <div className={styles.desktopOnly}>
          <Wordmark size="l" />
        </div>
        <p className={styles.made}>
          <SparkleStar size={12} />
          Made in South Africa
        </p>
        <a className={styles.email} href={`mailto:${EMAIL}`}>
          {EMAIL}
        </a>
      </div>
      <p className={styles.rec}>{`© ${year} DÉJÀ GATSBY · REC`}</p>
    </footer>
  );
}
