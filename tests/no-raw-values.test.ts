import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, test } from "node:test";
import { fileURLToPath } from "node:url";

// Every colour and font family lives in tokens.css. textures.css is the one
// other file allowed raw values, for the noise and gradient recipes.
const SRC = fileURLToPath(new URL("../src", import.meta.url));
const EXEMPT = new Set(["design-system/tokens.css", "design-system/textures.css"]);

// The lookbehind skips HTML entities such as &#8203;.
const HEX = /(?<![&\w])#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{3,4})\b/gi;
const COLOUR_FN = /\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch)\(/gi;
const FONT_FAMILY = /(?<![\w-])font-family\s*:\s*([^;{}]*)/gi;
const FONT_FAMILY_PROP = /\bfontFamily\s*[:=]\s*\{?\s*(["'`])(.*?)\1/g;
// Only checked in CSS: in TSX, `font:` is as likely to be a prop or a type.
const FONT_SHORTHAND = /(?<![\w-])font\s*:\s*([^;{}]*)/gi;

const KEYWORD = /^(?:inherit|initial|unset|revert|revert-layer)$/;
const TOKEN = /var\(--dg-[\w-]+\)/g;

// A font-family must be tokens only. A font shorthand ends in its family, so
// it must end in a font token.
function familyIsStray(value: string): boolean {
  const rest = value.replace(TOKEN, "").replace(/!important|[,\s]/g, "");
  return rest !== "" && !KEYWORD.test(rest);
}

function shorthandIsStray(value: string): boolean {
  const trimmed = value.replace(/!important/, "").trim();
  return !KEYWORD.test(trimmed) && !/var\(--dg-font-[\w-]+\)$/.test(trimmed);
}

function findStrayValues(source: string, kind: "css" | "tsx"): string[] {
  const found: { index: number; text: string }[] = [];
  const add = (match: RegExpMatchArray) => found.push({ index: match.index ?? 0, text: match[0].trim() });

  for (const match of source.matchAll(HEX)) add(match);
  for (const match of source.matchAll(COLOUR_FN)) add(match);
  for (const match of source.matchAll(FONT_FAMILY)) if (familyIsStray(match[1])) add(match);
  for (const match of source.matchAll(FONT_FAMILY_PROP)) if (familyIsStray(match[2])) add(match);
  if (kind === "css") {
    for (const match of source.matchAll(FONT_SHORTHAND)) if (shorthandIsStray(match[1])) add(match);
  }

  return found
    .sort((a, b) => a.index - b.index)
    .map(({ index, text }) => `line ${source.slice(0, index).split("\n").length}: ${text}`);
}

describe("findStrayValues", () => {
  test("flags a hex colour", () => {
    assert.equal(findStrayValues(".a { color: #fff; }", "css").length, 1);
    assert.equal(findStrayValues(".a { color: #F2EBDA; }", "css").length, 1);
    assert.equal(findStrayValues(".a { color: #F2EBDAcc; }", "css").length, 1);
  });

  test("flags colour functions", () => {
    assert.equal(findStrayValues(".a { color: rgb(0 0 0 / 50%); }", "css").length, 1);
    assert.equal(findStrayValues(".a { color: rgba(0, 0, 0, 0.5); }", "css").length, 1);
    assert.equal(findStrayValues(".a { color: hsl(0 0% 0%); }", "css").length, 1);
    assert.equal(findStrayValues(".a { color: oklch(0.5 0.1 200); }", "css").length, 1);
  });

  test("flags a font family named outside a token", () => {
    assert.equal(findStrayValues(".a { font-family: Arial; }", "css").length, 1);
    assert.equal(findStrayValues(`.a { font-family: "Chakra Petch"; }`, "css").length, 1);
    assert.equal(findStrayValues(".a { font-family: var(--dg-font-ui), sans-serif; }", "css").length, 1);
    assert.equal(findStrayValues(".a { font: 600 1rem/1.2 Arial; }", "css").length, 1);
  });

  test("flags a font family set from TSX", () => {
    assert.equal(findStrayValues(`<p style={{ fontFamily: "Aero" }} />`, "tsx").length, 1);
    assert.equal(findStrayValues(`<text fontFamily="Aero" />`, "tsx").length, 1);
  });

  test("allows tokens and CSS-wide keywords", () => {
    const css = `.a {
      color: var(--dg-fg);
      background: color-mix(in srgb, var(--dg-accent) 50%, transparent);
      font-family: var(--dg-font-ui);
      font: 600 var(--dg-text-small) var(--dg-font-ui);
    }
    .b { font: inherit; font-family: inherit; }`;
    assert.deepEqual(findStrayValues(css, "css"), []);
  });

  test("allows a font's name as text, and # in links and entities", () => {
    const tsx = `<p>Aero at 28 px</p><a href="#">More</a><a href="#main">Skip</a><span>&#8203;</span>`;
    assert.deepEqual(findStrayValues(tsx, "tsx"), []);
  });

  test("reports the line of each finding", () => {
    assert.deepEqual(findStrayValues(".a {\n  color: #fff;\n}", "css"), ["line 2: #fff"]);
  });
});

describe("src/", () => {
  test("has no raw colour or font family outside tokens.css and textures.css", () => {
    const files = readdirSync(SRC, { recursive: true, encoding: "utf8" })
      .filter((file) => /\.(css|tsx)$/.test(file) && !EXEMPT.has(file));
    assert.ok(files.length > 0, "found no .css or .tsx files to check");

    const found = files.flatMap((file) => {
      const source = readFileSync(join(SRC, file), "utf8");
      const kind = file.endsWith(".css") ? "css" : "tsx";
      return findStrayValues(source, kind).map((finding) => `src/${file} ${finding}`);
    });
    assert.deepEqual(found, []);
  });
});
