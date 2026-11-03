// What TexturesSection shows, kept out of the .tsx so
// tests/system-textures.test.ts can check it against textures.css and
// tokens.css.

export type Texture = { utility: string; name: string; tokens: readonly string[]; use: string };

// SPEC-design-system.md › Textures: the style tile's six in its order, then
// glass, the vignette and the backdrop, which the tile doesn't have.
export const TEXTURES = [
  { utility: "dg-grain", name: "Grain", tokens: ["--dg-grain-opacity"], use: "The page frame. Shown at 5×" },
  { utility: "dg-scanlines", name: "Scanlines", tokens: ["--dg-scanline"], use: "The now-playing bar only" },
  { utility: "dg-halftone", name: "Halftone", tokens: [], use: "Covers and duotone panels" },
  { utility: "dg-tape", name: "Stacked tape", tokens: ["--dg-tape", "--dg-tape-artwork"], use: "Aero titles. On artwork, the wordmark" },
  { utility: "dg-glow", name: "Glow", tokens: ["--dg-glow-accent", "--dg-glow-accent-box"], use: "Active readouts, lit boxes" },
  { utility: "dg-sticker", name: "Sticker", tokens: [], use: "Cutout images" },
  { utility: "dg-glass", name: "Glass", tokens: ["--dg-glass-filter"], use: "The header and filter boxes" },
  { utility: "dg-vignette", name: "Vignette", tokens: ["--dg-vignette"], use: "The page frame" },
  {
    utility: "dg-backdrop",
    name: "Grid backdrop",
    tokens: ["--dg-grid-line", "--dg-grid-cell", "--dg-grid-drift", "--dg-grid-glow"],
    use: "Behind every page",
  },
] as const satisfies readonly Texture[];

export type Utility = (typeof TEXTURES)[number]["utility"];

// SPEC-design-system.md › Shadows, glows and the backdrop: the box shadows.
export const SHADOWS = [
  { token: "--dg-shadow-float", use: "The header and filter boxes" },
  { token: "--dg-shadow-menu", use: "The open filter list" },
  { token: "--dg-shadow-bar", use: "The now-playing bar" },
  { token: "--dg-glow-cover", use: "Hero covers" },
] as const;
