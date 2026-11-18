// Writes the files of the Déjà Gatsby Design System artifact to
// .design-system/project/, from the same tokens, fonts and marks the site uses.
// It only writes locally: publishing is a separate step Reno approves.
import { copyFile, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseTokens } from "../src/design-system/contrast.ts";
import { STAR_PATH } from "../src/design-system/components/SparkleStar/star.ts";

type Token = { name: string; value: string; usage: string };
type TypeStyle = { name: string; fontSize: string; lineHeight: number; fontWeight: number; letterSpacing?: string; usage: string };

const short = (token: string) => token.replace(/^--dg-/, "");
const HEX = /^#[0-9a-f]{6}$/i;
const ALIAS = /^var\(--dg-([a-z0-9-]+)\)$/;

function specRows(spec: string): string[][] {
  return spec
    .split("\n")
    .filter((line) => line.startsWith("| `--dg-"))
    .map((line) => line.slice(1, -1).split(/(?<!\\)\|/).map((cell) => cell.trim().replace(/\\\|/g, "|")));
}

export function specUsage(spec: string): Map<string, string> {
  return new Map(specRows(spec).map((cells) => [cells[0].replace(/`/g, ""), cells.at(-1)!.replace(/`/g, "")]));
}

const px = (value: string) => {
  const largest = /^clamp\(.*,\s*([\d.]+)rem\)$/.exec(value)?.[1] ?? /^([\d.]+)rem$/.exec(value)?.[1];
  if (!largest) throw new Error(`Can't read the size "${value}"`);
  return `${Number(largest) * 16}px`;
};

export function buildTokens(css: string, spec: string) {
  // The widest values, so a size is the one the desktop boards show.
  const values = parseTokens(css, 1440);
  const usage = specUsage(spec);
  const skipped: string[] = [];
  const isColour = (value: string | undefined): boolean => {
    if (!value) return false;
    const alias = ALIAS.exec(value)?.[1];
    return HEX.test(value) || (!!alias && isColour(values.get(`--dg-${alias}`)));
  };
  const note = (token: string, fallback: string) => usage.get(token) ?? fallback;

  const colours: Token[] = [];
  for (const [token, value] of values) {
    if (value.startsWith("color-mix(")) skipped.push(short(token));
    if (!isColour(value)) continue;
    const alias = ALIAS.exec(value)?.[1];
    colours.push({ name: short(token), value: alias ? `{${alias}}` : value.toLowerCase(), usage: note(token, alias ? `The role ${alias} plays here.` : "Palette colour.") });
  }

  const scale = (pattern: RegExp) =>
    [...values].filter(([token]) => pattern.test(token)).map(([token, value]) => ({ name: short(token), value, usage: note(token, "From the spacing and shape scale.") }));

  const groups = new Map<string, TypeStyle[]>([["Display", []], ["Interface", []], ["Readout", []]]);
  for (const cells of specRows(spec)) {
    const token = cells[0].replace(/`/g, "");
    if (!token.startsWith("--dg-text-")) continue;
    const font = cells[1];
    const group = font.startsWith("Aero") ? "Display" : font.startsWith("VT323") ? "Readout" : "Interface";
    const tracking = /`([\d.]+em)`/.exec(font)?.[1];
    groups.get(group)!.push({
      name: short(token).replace(/^text-/, ""),
      fontSize: px(values.get(token)!),
      lineHeight: group === "Display" ? 1 : group === "Readout" ? 1.1 : 1.5,
      fontWeight: /\b600\b/.test(font) ? 600 : 400,
      ...(tracking ? { letterSpacing: tracking } : {}),
      usage: cells.at(-1)!.replace(/`/g, ""),
    });
  }
  const FAMILY = { Display: "display", Interface: "ui", Readout: "readout" } as const;

  return {
    skipped,
    tokens: {
      name: "Déjà Gatsby",
      version: 1,
      meta: { source: "repository", paths: { tokens: ["src/design-system/tokens.css"], docs: ["SPEC-design-system.md"] } },
      color: { themes: [{ id: "night", name: "Night" }], tokens: colours },
      type: {
        // Aero's file stays out until its licence is confirmed (SPEC.md, open question 1).
        fonts: [
          { family: "Chakra Petch", file: "fonts/chakra-petch-400.woff2", weight: "400" },
          { family: "Chakra Petch", file: "fonts/chakra-petch-600.woff2", weight: "600" },
          { family: "VT323", file: "fonts/vt323-400.woff2", weight: "400" },
        ],
        families: {
          display: '"Aero", "Chakra Petch", system-ui, sans-serif',
          ui: '"Chakra Petch", system-ui, sans-serif',
          readout: '"VT323", ui-monospace, monospace',
        },
        groups: [...groups].map(([name, styles]) => ({ name, family: FAMILY[name as keyof typeof FAMILY], styles })),
      },
      spacing: { tokens: scale(/^--dg-space-\d+$/) },
      radius: { tokens: scale(/^--dg-radius-[0a-z]$/) },
    },
  };
}

export const README = `# Déjà Gatsby

Nostalgia seen through a cyberpunk lens: a night city in blue-black, lit by sodium lamps and CRT glow, shot on grainy film. Déjà Gatsby is a music artist. Everything here serves one job: a fan hears a snippet, then streams the full song.

## Content fundamentals

- Say it short and plainly: "New single", "Play snippet", "Hear the full track", "Follow the signal".
- Readouts talk like a VCR, in VT323 capitals with zero-padded time: \`PLAY 00:12 / 00:30\`, \`30 SEC SNIPPETS\`, \`© 2026 DÉJÀ GATSBY · REC\`.
- Write the artist as "Déjà Gatsby", with both accents. Handles are @thesamegatsby.
- Use a release's title exactly as it's written: "Welcome to Vapor_City" keeps its underscore.

## Visual foundations

1. **Night first.** The ground is \`ink-950\`, and surfaces are \`ink-900\` and \`ink-800\`. Colour arrives as light, not as large flat fills.
2. **At most two accents on any surface.** \`sodium-400\` is the "on" light: playing, progress, the primary button. \`signal-300\` is the sparkle and focus. \`hazard-500\` and \`ultra-500\` make the stacked tape.
3. **Cover art is sacred.** Never put text, marks, scanlines or filters on cover art.
4. **The sparkle means "this one".** It marks the active thing, at most three on screen.
5. **Texture stays quiet.** Grain is at or under 8% opacity, over a slowly drifting ultramarine grid.
6. **Motion moves like tape:** steps and snaps, no bouncy springs, and none under reduced motion.

## Type

- **Aero** is display only: release titles and the wordmark. Never set it below 24 px or in body text, and never fake its bold or italic.
- **Stacked tape (V5):** Aero is \`bone-100\`, with a hard \`ultra-500\` shadow at \`0.03em 0.04em\` and \`hazard-500\` at 55% at \`0.06em 0.08em\`. No chrome or gloss.
- **Chakra Petch** is for the interface, and **VT323** for readouts.
- **Licence:** Aero's web and artwork licence isn't confirmed yet, so its font file is not in this system. Use the outlined wordmark asset, which needs no font. If Aero isn't available for a title, say so instead of passing another face off as it.

## Marks

- \`assets/Marks/wordmark.svg\` is "Déjà Gatsby" outlined, in the screen tone. Always use the file, never retype the logo.
- \`assets/Marks/sparkle-star.svg\` is the four-point star, in \`signal-300\`.

## Making a post or story

Given a track title and its cover:

- **Sizes:** a post is exactly **1080 × 1350**, and a story exactly **1080 × 1920**.
- **Ground:** \`ink-950\`, an \`ultra-500\` glow from the upper middle, and a faint 72 px ultramarine grid.
- **Cover:** 920 px square, 80 px from each side, 24 px corners, a \`line\` hairline and a soft ultramarine glow. Crop to the centre if it isn't square.
- **Label:** the sparkle, then "NEW SINGLE", "NEW EP", "NEW ALBUM", "NEW REMIX" or "NEW EDIT" in VT323, \`sodium-400\`, about 48 px.
- **Title:** in Aero with the stacked tape, as large as fits the 920 px column: up to two lines on a post and three on a story.
- **Wordmark:** the asset, left-aligned at the 80 px margin.
- **Post order:** cover, label, title, wordmark.
- **Story order:** wordmark, cover, label, title. Keep everything 250 px clear of the top and 340 px clear of the bottom, for Instagram's interface.
- Nothing overlaps the cover. Use only what you're given: no invented dates, quotes or platform claims.

## Not in this system

- **Aero's font file**, until the licence is confirmed.
- **Translucent colours, glows and tape shadows**, which the token format can't hold. They're described above, and their source is \`src/design-system/tokens.css\`.
- **React components.** The live ones are in the site's repository.
`;

const star = (x: number, y: number, size: number, tone: string) =>
  `<path class="${tone}" transform="translate(${x} ${y}) scale(${size / 24})" d="${STAR_PATH}"/>`;

export const COVER_HTML = `<!-- @dsCard height=288 -->
<style>
  html, body { margin: 0; height: 100%; background: var(--ink-950); }
  .cover { position: relative; width: 960px; height: 288px; overflow: hidden; background: var(--ink-950); }
  svg { position: absolute; inset: 0; }
  .ultra { fill: var(--ultra-500); } .sodium { fill: var(--sodium-400); } .hazard { fill: var(--hazard-500); }
  .night { fill: var(--ink-800); } .signal { fill: var(--signal-300); } .bone { fill: var(--bone-100); }
  .text { position: absolute; left: 32px; bottom: 32px; width: 440px; }
  h1 { margin: 0; font: 400 64px/.95 var(--font-display); color: var(--bone-100); }
  p { margin: 12px 0 0; font: 400 14px/1.4 var(--font-ui); color: var(--bone-300); }
</style>
<div class="cover">
  <!-- blocks: ultra-500 256x288, sodium-400 128x96, ink-800 224x128, hazard-500 96x64
       arrangement: a tall ultramarine slab with lit windows beside it, bleeding off the top and right
       pattern: the literal motif, the four-point sparkle the brand uses to mean "this one"
       scales: every side is a multiple of space-8 (64px) or space-6 (32px), corners radius-0 -->
  <svg width="960" height="288" viewBox="0 0 960 288" aria-hidden="true">
    <rect class="ultra" x="480" y="0" width="256" height="288"/>
    <rect class="sodium" x="736" y="0" width="128" height="96"/>
    <rect class="night" x="736" y="96" width="224" height="128"/>
    <rect class="hazard" x="864" y="224" width="96" height="64"/>
    ${star(512, 40, 96, "bone")}${star(632, 176, 64, "signal")}${star(824, 128, 64, "signal")}
  </svg>
  <div class="text"><h1>Déjà Gatsby</h1><p>Nostalgia seen through a cyberpunk lens.</p></div>
</div>
`;

const MARKS_README = `# Marks

The wordmark is drawn in bone with ultramarine and hazard tape. The sparkle's ink is \`signal-300\`. Don't recolour or redraw either.
`;

async function main() {
  const root = join(dirname(fileURLToPath(import.meta.url)), "..");
  const out = join(root, ".design-system", "project");
  const source = (path: string) => join(root, "src/design-system", path);
  await rm(join(root, ".design-system"), { recursive: true, force: true });
  for (const dir of ["components/Cover", "fonts", "assets/Marks"]) await mkdir(join(out, dir), { recursive: true });

  const [css, spec] = await Promise.all([readFile(source("tokens.css"), "utf8"), readFile(join(root, "SPEC-design-system.md"), "utf8")]);
  const { tokens, skipped } = buildTokens(css, spec);
  await writeFile(join(out, "tokens.json"), `${JSON.stringify(tokens, null, 2)}\n`);
  await writeFile(join(out, "README.md"), README);
  await writeFile(join(out, "components/Cover/preview.html"), COVER_HTML);
  await writeFile(join(out, "assets/Marks/README.md"), MARKS_README);
  for (const font of ["chakra-petch-400.woff2", "chakra-petch-600.woff2", "vt323-400.woff2"]) await copyFile(source(`fonts/${font}`), join(out, "fonts", font));
  for (const mark of ["wordmark.svg", "sparkle-star.svg"]) await copyFile(source(`assets/${mark}`), join(out, "assets/Marks", mark));
  console.log(`Wrote ${out}\n${tokens.color.tokens.length} colours, ${tokens.spacing.tokens.length} spaces, ${tokens.radius.tokens.length} radii. Left out: ${skipped.join(", ")}`);
}

if (import.meta.main) await main();
