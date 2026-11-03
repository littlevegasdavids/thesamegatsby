import localFont from "next/font/local";

/* The four self-hosted faces in SPEC-design-system.md › Fonts, subset to
   Latin-1 (tests/fonts.test.ts holds the budget). Only Aero and Chakra Petch
   400 are preloaded.

   next/font names each family after its constant, and its class and CSS
   variable point at that name. Each variable carries next/font's size-adjusted
   fallback, and tokens.css builds the font tokens on them. */

const aero = localFont({
  src: "./fonts/aero.woff2",
  weight: "400",
  display: "swap",
  variable: "--font-aero",
});

const chakraPetch = localFont({
  src: "./fonts/chakra-petch-400.woff2",
  weight: "400",
  display: "swap",
  declarations: [{ prop: "font-family", value: "chakraPetch" }],
  variable: "--font-chakra-petch",
});

// The 600 face joins chakraPetch's family by naming it, so weight 600 gets a
// real face without being preloaded. Its own class and variable would point
// at a "chakraPetchSemiBold" family that doesn't exist, so nothing reads them:
// importing this module is what adds the face.
export const chakraPetchSemiBold = localFont({
  src: "./fonts/chakra-petch-600.woff2",
  weight: "600",
  display: "swap",
  preload: false,
  declarations: [{ prop: "font-family", value: "chakraPetch" }],
  adjustFontFallback: false,
});

const vt323 = localFont({
  src: "./fonts/vt323-400.woff2",
  weight: "400",
  display: "swap",
  preload: false,
  variable: "--font-vt323",
});

// For <html>: :root is where tokens.css reads the variables.
export const fontVariables = [aero, chakraPetch, vt323].map((font) => font.variable).join(" ");
