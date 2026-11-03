import type { ReactNode } from "react";
import styles from "../system.module.css";
import { SHADOWS, TEXTURES, type Utility } from "./textures";

// Each utility on the surface the style tile shows it on. Record<Utility, …>
// makes a texture added to textures.ts fail the typecheck until it has one.
const SAMPLES: Record<Utility, ReactNode> = {
  "dg-grain": <span className={`${styles.textureBox} ${styles.raised} ${styles.grainLoud} dg-grain`} />,
  "dg-scanlines": <span className={`${styles.textureBox} ${styles.panel} dg-scanlines`} />,
  "dg-halftone": (
    <span className={`${styles.textureBox} ${styles.panel}`}>
      <span className={`${styles.layer} ${styles.amber} dg-halftone`} />
    </span>
  ),
  "dg-tape": (
    <span className={styles.textureBox}>
      <span className={`${styles.half} ${styles.aero} dg-tape`}>Aa</span>
      <span className={`${styles.half} ${styles.panel} ${styles.aero} ${styles.artwork}`}>Aa</span>
    </span>
  ),
  "dg-glow": (
    <span className={`${styles.textureBox} ${styles.lit} dg-glow`}>
      <span className={styles.lamp} />
      PLAY
    </span>
  ),
  "dg-sticker": (
    <span className={styles.textureBox}>
      <span className={`${styles.cutout} ${styles.panel} dg-sticker`}>
        <span className={`${styles.layer} ${styles.amber} dg-halftone`} />
      </span>
    </span>
  ),
  "dg-glass": (
    <span className={`${styles.textureBox} ${styles.stripes}`}>
      <span className={`${styles.pane} dg-glass`} />
    </span>
  ),
  "dg-vignette": (
    <span className={`${styles.textureBox} ${styles.panel}`}>
      <span className={`${styles.layer} dg-vignette`} />
    </span>
  ),
  "dg-backdrop": (
    <span className={`${styles.textureBox} ${styles.ground}`}>
      <span className={`${styles.layer} dg-backdrop`} />
    </span>
  ),
};

export function TexturesSection() {
  return (
    <section className={styles.section} aria-labelledby="textures">
      <h2 id="textures" className={styles.heading}>Textures</h2>
      <div className={styles.blocks}>
        <section aria-labelledby="textures-motifs">
          <h3 id="textures-motifs" className={`${styles.label} ${styles.blockHeading}`}>Motifs · textures</h3>
          <ul className={styles.swatches}>
            {TEXTURES.map(({ utility, name, tokens, use }) => (
              <li key={utility} className={styles.stack}>
                {SAMPLES[utility]}
                <span className={styles.name}>{name}</span>
                <code className={styles.code}>.{utility}</code>
                {tokens.map((token) => (
                  <code key={token} className={styles.code}>{token}</code>
                ))}
                <span className={styles.cap}>{use}</span>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="textures-shadows">
          <h3 id="textures-shadows" className={`${styles.label} ${styles.blockHeading}`}>Shadows and glows</h3>
          <ul className={`${styles.swatches} ${styles.shadows}`}>
            {SHADOWS.map(({ token, use }) => (
              <li key={token} className={styles.stack}>
                <span className={styles.shadowBox} style={{ boxShadow: `var(${token})` }} />
                <code className={styles.code}>{token}</code>
                <span className={styles.cap}>{use}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </section>
  );
}
