import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseTokens } from "../../../design-system/contrast";
import styles from "../system.module.css";
import { PRIMITIVES, SEMANTIC, TYPE_SCALE, describeColour, describeSize, ratioOnBg } from "./tokens";

// Every token, sampled from tokens.css itself. The values and ratios are read
// at build time, so the swatches can't drift from the file they show.
export function TokensSection() {
  const css = readFileSync(join(process.cwd(), "src/design-system/tokens.css"), "utf8");
  const phone = parseTokens(css, 0);
  const desktop = parseTokens(css, 768);
  const named = (prefix: string) => [...phone.keys()].filter((name) => name.startsWith(prefix));

  return (
    <section className={styles.section} aria-labelledby="tokens">
      <h2 id="tokens" className={styles.heading}>Tokens</h2>
      <div className={styles.blocks}>
        <section aria-labelledby="tokens-colour">
          <h3 id="tokens-colour" className={`${styles.label} ${styles.blockHeading}`}>
            Colour · contrast on tape black
          </h3>
          <ul className={styles.swatches}>
            {PRIMITIVES.map(({ token, name, role }) => (
              <li key={token} className={styles.stack}>
                <span className={styles.colour} style={{ background: `var(${token})` }} />
                <span className={styles.name}>{name}</span>
                <span className={styles.cap}>
                  {describeColour(phone, token)} · {ratioOnBg(phone, token)}
                </span>
                {role && <span className={styles.cap}>{role}</span>}
                <code className={styles.code}>{token}</code>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="tokens-type">
          <h3 id="tokens-type" className={`${styles.label} ${styles.blockHeading}`}>Type</h3>
          <ul className={styles.typeScale}>
            {TYPE_SCALE.map(({ token, look, face, use, sample }) => (
              <li key={`${token} ${look}`} className={styles.stack}>
                <p className={`${styles.sample} ${styles[look]}`} style={{ fontSize: `var(${token})` }}>
                  {look === "readout" && (
                    <svg className={styles.glyph} viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M5 3v18l16-9z" fill="currentColor" />
                    </svg>
                  )}
                  {sample}
                </p>
                <span className={styles.cap}>
                  {face} · {describeSize(phone, desktop, token)} · {use}
                </span>
                <code className={styles.code}>{token}</code>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="tokens-semantic">
          <h3 id="tokens-semantic" className={`${styles.label} ${styles.blockHeading}`}>
            Semantic colour · contrast on tape black
          </h3>
          <ul className={styles.swatches}>
            {SEMANTIC.map((token) => (
              <li key={token} className={styles.stack}>
                <span className={`${styles.colour} ${styles.colourSmall}`} style={{ background: `var(${token})` }} />
                <code className={styles.code}>{token}</code>
                <span className={styles.cap}>{describeColour(phone, token)}</span>
                <span className={styles.cap}>{ratioOnBg(phone, token)}</span>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="tokens-space">
          <h3 id="tokens-space" className={`${styles.label} ${styles.blockHeading}`}>Space</h3>
          <ul className={styles.rows}>
            {named("--dg-space-").map((token) => (
              <li key={token} className={styles.measure}>
                <span className={styles.gauge}>
                  <span className={styles.spaceBar} style={{ width: `var(${token})` }} />
                </span>
                <code className={styles.code}>{token}</code>
                <span className={styles.cap}>{phone.get(token)}</span>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="tokens-radius">
          <h3 id="tokens-radius" className={`${styles.label} ${styles.blockHeading}`}>Radius</h3>
          <ul className={styles.swatches}>
            {named("--dg-radius-").map((token) => (
              <li key={token} className={styles.stack}>
                <span className={styles.radiusBox} style={{ borderRadius: `var(${token})` }} />
                <code className={styles.code}>{token}</code>
                <span className={styles.cap}>{phone.get(token)}</span>
              </li>
            ))}
            <li className={styles.stack}>
              <span className={styles.chamferBox} />
              <code className={styles.code}>--dg-chamfer</code>
              <span className={styles.cap}>Top-right corner cut 12px</span>
            </li>
          </ul>
        </section>

        <section aria-labelledby="tokens-motion" className={styles.motion}>
          <h3 id="tokens-motion" className={`${styles.label} ${styles.blockHeading}`}>Motion</h3>
          <label className={styles.toggle}>
            <input type="checkbox" className={styles.toggleInput} />
            Run the samples
          </label>
          <ul className={styles.rows}>
            {named("--dg-dur-").map((token) => (
              <li key={token} className={styles.stack}>
                <span className={styles.track}>
                  <span className={styles.runner} style={{ transitionDuration: `var(${token})` }}>
                    <span className={styles.dot} />
                  </span>
                </span>
                <span>
                  <code className={styles.code}>{token}</code>{" "}
                  <span className={styles.cap}>{phone.get(token)}</span>
                </span>
              </li>
            ))}
          </ul>
          <p className={styles.easing}>
            <code className={styles.code}>--dg-ease-tape</code>{" "}
            <span className={styles.cap}>{phone.get("--dg-ease-tape")}</span>
          </p>
        </section>
      </div>
    </section>
  );
}
