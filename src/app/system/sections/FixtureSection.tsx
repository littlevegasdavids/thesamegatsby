import Image from "next/image";
import { releaseCategory, releaseFilterOptions } from "../../../design-system/release-filter";
import { FIXTURE_RELEASES } from "../fixtures";
import styles from "../system.module.css";

const TYPE = { single: "Single", ep: "EP", album: "Album" } as const;

const OPTIONS = releaseFilterOptions(FIXTURE_RELEASES);

// The bench's catalogue, which the later sections render. It's listed in
// Main.dc.html's order, with the filter options counted from it, so the
// counts can be checked against the canvas's dropdown and buttons.
export function FixtureSection() {
  return (
    <section className={styles.section} aria-labelledby="fixture">
      <h2 id="fixture" className={styles.heading}>Fixture</h2>
      <div className={styles.blocks}>
        <section aria-labelledby="fixture-releases">
          <h3 id="fixture-releases" className={`${styles.label} ${styles.blockHeading}`}>Releases</h3>
          <ol className={styles.rows}>
            {FIXTURE_RELEASES.map((release) => {
              const counted = OPTIONS.find(({ key }) => key === releaseCategory(release))?.label;
              const tracks = release.tracks.length;
              return (
                <li key={release.id} className={styles.fixtureRow}>
                  <Image src={release.cover} alt="" width={56} height={56} className={styles.fixtureCover} />
                  <span className={styles.stack}>
                    <span className={styles.name}>{release.title}</span>
                    <span className={styles.cap}>
                      {TYPE[release.type]} · {tracks} {tracks === 1 ? "track" : "tracks"} · under {counted}
                    </span>
                  </span>
                </li>
              );
            })}
          </ol>
        </section>

        <section aria-labelledby="fixture-filter">
          <h3 id="fixture-filter" className={`${styles.label} ${styles.blockHeading}`}>Filter options</h3>
          <ul className={styles.rows}>
            {OPTIONS.map(({ key, label, count }) => (
              <li key={key} className={styles.measure}>
                <span className={styles.name}>{label}</span>
                <span className={styles.code}>{count}</span>
              </li>
            ))}
          </ul>
          <p className={`${styles.cap} ${styles.fixtureNote}`}>
            releaseFilterOptions() · a remix or edit single counts under Remixes &amp; edits · empty types are left out
          </p>
        </section>
      </div>
    </section>
  );
}
