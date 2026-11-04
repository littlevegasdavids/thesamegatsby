import type { Metadata } from "next";
import { ButtonSection } from "./sections/ButtonSection";
import { FixtureSection } from "./sections/FixtureSection";
import { MarksSection } from "./sections/MarksSection";
import { ReadoutSection } from "./sections/ReadoutSection";
import { TexturesSection } from "./sections/TexturesSection";
import { TokensSection } from "./sections/TokensSection";
import styles from "./system.module.css";

// The test bench for SPEC-design-system.md: every token, texture and
// component, checked here against the approved canvas. Nothing links to it,
// it isn't indexed, and `/` loads none of its code.
export const metadata: Metadata = {
  title: "System · Déjà Gatsby",
  robots: { index: false },
};

export default function System() {
  return (
    <main className={styles.page}>
      <header className={styles.intro}>
        <h1 className={styles.pageTitle}>System</h1>
        <p className={styles.lede}>
          Every token and component in the design system, checked here against the approved canvas.
        </p>
      </header>
      <TokensSection />
      <TexturesSection />
      <MarksSection />
      <ButtonSection />
      <ReadoutSection />
      <FixtureSection />
    </main>
  );
}
