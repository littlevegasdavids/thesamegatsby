import type { Metadata } from "next";
import { ButtonSection } from "./sections/ButtonSection";
import { DiscographySection } from "./sections/DiscographySection";
import { FixtureSection } from "./sections/FixtureSection";
import { HeaderSection } from "./sections/HeaderSection";
import { HeroSection } from "./sections/HeroSection";
import { IconsSection } from "./sections/IconsSection";
import { LinksSection } from "./sections/LinksSection";
import { MarksSection } from "./sections/MarksSection";
import { PlayerSection } from "./sections/PlayerSection";
import { ReadoutSection } from "./sections/ReadoutSection";
import { StickyStackSection } from "./sections/StickyStackSection";
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
      <IconsSection />
      <LinksSection />
      <HeaderSection />
      <DiscographySection />
      <StickyStackSection />
      <HeroSection />
      <PlayerSection />
    </main>
  );
}
