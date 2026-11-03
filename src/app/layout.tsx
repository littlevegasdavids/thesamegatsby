import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
// From its own file, not index.ts: the barrel would pull every component's
// CSS onto every page.
import { Screen } from "../design-system/components/Screen/Screen";
import { fontVariables } from "../design-system/fonts";
import "../design-system/tokens.css";
import "../design-system/textures.css";

export const metadata: Metadata = {
  title: "Déjà Gatsby",
};

// cover lets the page run under a notch or home bar, so Screen and the
// now-playing bar can pad by the safe-area insets themselves.
export const viewport: Viewport = {
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={fontVariables}>
      <body>
        <Screen>{children}</Screen>
      </body>
    </html>
  );
}
