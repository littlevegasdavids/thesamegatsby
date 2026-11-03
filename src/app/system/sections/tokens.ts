import { tokenContrast, type Tokens } from "../../../design-system/contrast.ts";

// What TokensSection shows, kept out of the .tsx so tests/system-tokens.test.ts
// can check it against tokens.css. Values and ratios are read from tokens.css
// at build time, so no colour is written here.

export type Swatch = { token: string; name: string; role?: string };

// The style tile's twelve, with its names and in its order. Where the tile
// gives a role instead of a ratio, the colour isn't used for text. White and
// black aren't on the tile.
export const PRIMITIVES: readonly Swatch[] = [
  { token: "--dg-ink-950", name: "Tape black", role: "Ground" },
  { token: "--dg-ink-900", name: "Night sky", role: "Surface" },
  { token: "--dg-ink-800", name: "Bar", role: "Raised" },
  { token: "--dg-ink-700", name: "Hairline", role: "Lines" },
  { token: "--dg-bone-100", name: "Bone" },
  { token: "--dg-bone-300", name: "Bone muted" },
  { token: "--dg-bone-500", name: "Bone subtle" },
  { token: "--dg-sodium-400", name: "Sodium" },
  { token: "--dg-signal-300", name: "Signal" },
  { token: "--dg-hazard-500", name: "Hazard" },
  { token: "--dg-ultra-500", name: "Ultramarine", role: "Panels" },
  { token: "--dg-ultra-300", name: "Ultra light" },
  { token: "--dg-white", name: "White", role: "Artwork" },
  { token: "--dg-black", name: "Black", role: "Shadows" },
];

// SPEC-design-system.md › Semantic tokens, in its order. --dg-glass-filter
// isn't a colour; it's shown with the glass surface (DS-7).
export const SEMANTIC: readonly string[] = [
  "--dg-bg", "--dg-surface", "--dg-surface-raised", "--dg-surface-glass",
  "--dg-surface-translucent", "--dg-field", "--dg-accent-wash", "--dg-line", "--dg-outline",
  "--dg-fg", "--dg-fg-muted", "--dg-fg-subtle", "--dg-accent", "--dg-on-accent",
  "--dg-focus", "--dg-star", "--dg-rec", "--dg-link", "--dg-panel", "--dg-on-panel",
];

// The CSS class each sample is set in: system.module.css gives it the face,
// weight, case and tracking the spec's Typography table lists for it.
export type Look = "display" | "title" | "body" | "button" | "chip" | "label" | "micro" | "readout" | "readoutSmall";

export type TypeSample = { token: string; look: Look; face: string; use: string; sample: string };

// SPEC-design-system.md › Typography, in its order. --dg-text-small has two
// looks. The samples are the style tile's where it has one.
export const TYPE_SCALE: readonly TypeSample[] = [
  { token: "--dg-text-display-xl", look: "display", face: "Aero", use: "Hero titles", sample: "Welcome to Vapor_City" },
  { token: "--dg-text-display-l", look: "display", face: "Aero", use: "The wordmark in the header and footer", sample: "Déjà Gatsby" },
  { token: "--dg-text-title", look: "title", face: "Chakra Petch 600", use: "Release titles in rows", sample: "You who could be Forever" },
  { token: "--dg-text-title-s", look: "title", face: "Chakra Petch 600", use: "Track titles, the now-playing title", sample: "Give me that KaiZen" },
  { token: "--dg-text-body", look: "body", face: "Chakra Petch 400", use: "Running text", sample: "Tap a track, hear thirty seconds, then stream the rest wherever you listen." },
  { token: "--dg-text-small", look: "button", face: "Chakra Petch 600", use: "Button text", sample: "Play snippet" },
  { token: "--dg-text-small", look: "chip", face: "Chakra Petch 400", use: "Stream chips, footer links", sample: "Apple Music" },
  { token: "--dg-text-label", look: "label", face: "Chakra Petch 600", use: "Section labels, meta, tags", sample: "Stream it on" },
  { token: "--dg-text-micro", look: "micro", face: "Chakra Petch 400", use: "Platform names in the phone's bar only", sample: "SoundCloud" },
  { token: "--dg-text-readout", look: "readout", face: "VT323", use: "Time, the bar readout, the discography label", sample: "PLAY 00:12 / 00:30" },
  { token: "--dg-text-readout-s", look: "readoutSmall", face: "VT323", use: "Row meta, counts, the lead-track note", sample: "PLAYING 00:12" },
];

// The contrast of a colour token on the page ground, as the style tile
// writes it. Translucent tokens are composited over --dg-bg first.
export function ratioOnBg(tokens: Tokens, token: string): string {
  return `${tokenContrast(tokens, token, "--dg-bg").toFixed(1)}:1`;
}

function read(tokens: Tokens, token: string): string {
  const value = tokens.get(token);
  if (value === undefined) throw new Error(`${token} isn't defined`);
  return value;
}

const REM = /^(\d+(?:\.\d+)?)rem$/;
const CLAMP = /^clamp\((\S+), \S+, (\S+)\)$/;

function px(value: string): number {
  const rem = REM.exec(value);
  if (!rem) throw new Error(`can't read "${value}" as a size`);
  return Number(rem[1]) * 16;
}

// A type token's size in px, from its phone and its 768 px value. The
// readout face has no arrow or dash, so the wording avoids them.
export function describeSize(phone: Tokens, desktop: Tokens, token: string): string {
  const [small, large] = [read(phone, token), read(desktop, token)];
  const fluid = CLAMP.exec(small);
  if (fluid) return `${px(fluid[1])} to ${px(fluid[2])} px, fluid`;
  if (small === large) return `${px(small)} px`;
  return `${px(small)} px · ${px(large)} px from 768`;
}

const VAR = /^var\(--dg-([\w-]+)\)$/;
const MIX = /^color-mix\(in srgb, (.+) (\d+)%, transparent\)$/;

// A colour token's value as written, with each var() given as the primitive
// it names.
export function describeColour(tokens: Tokens, token: string): string {
  const value = read(tokens, token);
  const mix = MIX.exec(value);
  const primitive = (written: string) => VAR.exec(written)?.[1] ?? written;
  return mix ? `${primitive(mix[1])} at ${mix[2]}%` : primitive(value);
}
