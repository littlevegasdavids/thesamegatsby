import { useId } from "react";
import { PlatformIcon } from "../../assets/icons";
import type { SocialLink } from "../../types";
import { FOOTER_HEADING, SOCIAL_LABELS, orderSocials, socialHandle, socialName } from "./networks";
import styles from "./SocialLinks.module.css";

type Variant = "icons" | "handles" | "footer";

// Instagram and TikTok. icons is the phone header row, handles the desktop
// one, and footer the phone's "Follow the signal" block. The header picks
// icons or handles at 768 px; this renders whichever it's given.
export function SocialLinks({ links, variant }: { links: readonly SocialLink[]; variant: Variant }) {
  const headingId = useId();
  const items = (
    <ul className={styles.list}>
      {orderSocials(links).map((link) => (
        <li key={link.network}>
          <a
            className={styles.link}
            href={link.url}
            target="_blank"
            rel="noopener"
            aria-label={socialName(link, variant === "handles")}
          >
            <PlatformIcon icon={link.network} size={20} />
            {variant === "handles" && <span className={styles.handle}>{socialHandle(link)}</span>}
            {variant === "footer" && SOCIAL_LABELS[link.network]}
          </a>
        </li>
      ))}
    </ul>
  );

  if (variant === "footer") {
    return (
      <nav aria-labelledby={headingId} className={styles.footer}>
        <h2 id={headingId} className={styles.heading}>{FOOTER_HEADING}</h2>
        {items}
      </nav>
    );
  }

  return (
    <nav aria-label="Social" className={styles[variant]}>
      {items}
    </nav>
  );
}
