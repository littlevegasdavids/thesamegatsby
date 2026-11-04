// From their own files, not index.ts: through the barrel, the build put
// /system's CSS in the chunk / loads.
import { PlatformIcon } from "../../../design-system/assets/icons";
import { STAND_IN_ICONS, type IconName } from "../../../design-system/assets/icon-paths";
import { MAIN_PLATFORMS, MORE_PLATFORMS, PLATFORMS } from "../../../design-system/platforms";
import styles from "../system.module.css";

const SOCIALS: { icon: IconName; label: string }[] = [
  { icon: "instagram", label: "Instagram" },
  { icon: "tiktok", label: "TikTok" },
];

const GROUPS: { id: string; title: string; icons: { icon: IconName; label: string }[] }[] = [
  { id: "icons-main", title: "Main platforms", icons: MAIN_PLATFORMS.map((id) => ({ icon: id, label: PLATFORMS[id].label })) },
  { id: "icons-more", title: "Under More", icons: MORE_PLATFORMS.map((id) => ({ icon: id, label: PLATFORMS[id].label })) },
  { id: "icons-social", title: "Socials", icons: SOCIALS },
];

// The marks at the sizes the canvas draws them: 22 px over a label in the
// phone bar, 20 px inline everywhere else. They take their colour from the
// text around them, shown here in --dg-fg and in the accent.
export function IconsSection() {
  return (
    <section className={styles.section} aria-labelledby="icons">
      <h2 id="icons" className={styles.heading}>Icons</h2>
      <p className={`${styles.body} ${styles.sectionNote}`}>
        Simple Icons 16.36.0 (CC0), monochrome. Amazon Music is the canvas&rsquo;s stand-in until its own mark is
        sourced.
      </p>
      <div className={styles.blocks}>
        {GROUPS.map(({ id, title, icons }) => (
          <section key={id} aria-labelledby={id}>
            <h3 id={id} className={`${styles.label} ${styles.blockHeading}`}>{title}</h3>
            <ul className={styles.rows}>
              {icons.map(({ icon, label }) => (
                <li key={icon} className={styles.iconRow}>
                  <PlatformIcon icon={icon} size={22} />
                  <PlatformIcon icon={icon} size={20} />
                  <span className={styles.iconAccent}>
                    <PlatformIcon icon={icon} size={20} />
                  </span>
                  <span className={styles.name}>{label}</span>
                  {STAND_IN_ICONS.includes(icon) && <span className={styles.cap}>Stand-in</span>}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      <p className={`${styles.cap} ${styles.fixtureNote}`}>22 px · 20 px · 20 px in the accent · currentColor</p>
    </section>
  );
}
