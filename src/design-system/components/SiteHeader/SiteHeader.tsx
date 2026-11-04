import type { SocialLink } from "../../types";
import { SocialLinks } from "../SocialLinks/SocialLinks";
import { Wordmark } from "../Wordmark/Wordmark";
import styles from "./SiteHeader.module.css";

// The sticky header: the wordmark on the left, the socials on the right, on
// glass the page scrolls behind. It stays in flow, so the page reserves its
// height and nothing loads hidden beneath it. Both socials layouts render,
// and CSS shows the icons below 768 px and the handles from it, so there's
// no JavaScript media query and no flash on hydration.
export function SiteHeader({
  socials,
  variant = "floating",
}: {
  socials: readonly SocialLink[];
  variant?: "floating" | "bar";
}) {
  return (
    <header className={`${styles.header} ${styles[variant]} dg-glass`}>
      <Wordmark size="l" />
      <div className={styles.phone}>
        <SocialLinks variant="icons" links={socials} />
      </div>
      <div className={styles.desktop}>
        <SocialLinks variant="handles" links={socials} />
      </div>
    </header>
  );
}
