import type { Metadata } from "next";
import type { ReactNode } from "react";
import { fontVariables } from "../design-system/fonts";
import "../design-system/tokens.css";

export const metadata: Metadata = {
  title: "Déjà Gatsby",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={fontVariables}>
      <body>{children}</body>
    </html>
  );
}
