// WCAG 2.x contrast for the colour tokens in tokens.css. A ratio only means
// something between two opaque colours, so translucent tokens are painted
// onto an opaque backdrop first, the way the browser does.

export type Rgba = { r: number; g: number; b: number; a: number };
export type Tokens = Map<string, string>;

const MEDIA = /^@media\s*\(\s*min-width:\s*(\d+)px\s*\)$/;

// The custom properties tokens.css sets on :root at one viewport width: the
// phone values, then each `@media (min-width: …px)` block the width reaches.
// Any other rule throws, so nothing in the file escapes the contrast test.
export function parseTokens(css: string, width: number): Tokens {
  const tokens: Tokens = new Map();
  readRules(css.replace(/\/\*[\s\S]*?\*\//g, ""), width, tokens);
  return tokens;
}

function readRules(css: string, width: number, tokens: Tokens): void {
  let start = 0;
  for (let open = css.indexOf("{"); open !== -1; open = css.indexOf("{", start)) {
    const prelude = css.slice(start, open).trim();
    const close = matchingBrace(css, open);
    const body = css.slice(open + 1, close);
    const media = MEDIA.exec(prelude);
    if (prelude === ":root") readDeclarations(body, tokens);
    else if (media) {
      if (width >= Number(media[1])) readRules(body, width, tokens);
    } else throw new Error(`tokens.css: unsupported rule "${prelude}"`);
    start = close + 1;
  }
  const rest = css.slice(start).trim();
  if (rest) throw new Error(`tokens.css: unexpected "${rest}"`);
}

function matchingBrace(css: string, open: number): number {
  let depth = 0;
  for (let i = open; i < css.length; i++) {
    if (css[i] === "{") depth++;
    else if (css[i] === "}" && --depth === 0) return i;
  }
  throw new Error("tokens.css: unbalanced braces");
}

function readDeclarations(body: string, tokens: Tokens): void {
  for (const declaration of body.split(";")) {
    const colon = declaration.indexOf(":");
    const name = declaration.slice(0, colon).trim();
    if (colon === -1 || !name.startsWith("--")) continue;
    tokens.set(name, declaration.slice(colon + 1).trim().replace(/\s+/g, " "));
  }
}

const HEX = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i;
const VAR = /^var\((--[\w-]+)\)$/;
const MIX = /^color-mix\(in srgb, (.+) (\d+(?:\.\d+)?)%, transparent\)$/;

// Reads only the colour syntax tokens.css uses: #RRGGBB, var() and
// color-mix() against transparent.
export function resolveColor(tokens: Tokens, name: string): Rgba {
  const value = tokens.get(name);
  if (value === undefined) throw new Error(`${name} isn't defined`);
  return readColor(tokens, value, name);
}

function readColor(tokens: Tokens, value: string, name: string): Rgba {
  const hex = HEX.exec(value);
  if (hex) {
    const [r, g, b] = hex.slice(1).map((pair) => parseInt(pair, 16));
    return { r, g, b, a: 1 };
  }
  const alias = VAR.exec(value);
  if (alias) return resolveColor(tokens, alias[1]);
  const mix = MIX.exec(value);
  if (mix) {
    const color = readColor(tokens, mix[1], name);
    return { ...color, a: color.a * (Number(mix[2]) / 100) };
  }
  throw new Error(`${name}: can't read "${value}" as a colour`);
}

export function composite(top: Rgba, under: Rgba): Rgba {
  if (under.a !== 1) throw new Error("composite needs an opaque backdrop");
  const paint = (t: number, u: number) => t * top.a + u * (1 - top.a);
  return { r: paint(top.r, under.r), g: paint(top.g, under.g), b: paint(top.b, under.b), a: 1 };
}

function luminance({ r, g, b }: Rgba): number {
  const [R, G, B] = [r, g, b].map((channel) => {
    const c = channel / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

export function contrastRatio(a: Rgba, b: Rgba): number {
  if (a.a !== 1 || b.a !== 1) throw new Error("contrast needs two opaque colours");
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

// fg on bg, with bg painted over `backdrop` first if it's translucent. Most
// surfaces sit on the page ground; the accent wash sits on a raised row.
export function tokenContrast(tokens: Tokens, fg: string, bg: string, backdrop = "--dg-bg"): number {
  const surface = composite(resolveColor(tokens, bg), resolveColor(tokens, backdrop));
  return contrastRatio(composite(resolveColor(tokens, fg), surface), surface);
}
