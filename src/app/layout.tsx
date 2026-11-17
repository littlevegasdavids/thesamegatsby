import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
// From its own file, not index.ts: the barrel would pull every component's
// CSS onto every page.
import { Screen } from "../design-system/components/Screen/Screen";
import { fontVariables } from "../design-system/fonts";
import "../design-system/tokens.css";
import "../design-system/textures.css";
import { token } from "./tokens";

const TITLE = "Déjà Gatsby";
const DESCRIPTION = "Hear 30 seconds of every Déjà Gatsby track, then stream it in full.";

// The canonical host stays www (SPEC.md). The share image and icons come from
// the file conventions beside this layout.
export const metadata: Metadata = {
  metadataBase: new URL("https://www.thesamegatsby.com"),
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: { type: "website", url: "/", siteName: TITLE, title: TITLE, description: DESCRIPTION },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

// cover lets the page run under a notch or home bar, so Screen and the
// now-playing bar can pad by the safe-area insets themselves.
export const viewport: Viewport = {
  viewportFit: "cover",
  themeColor: token("--dg-bg"),
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
