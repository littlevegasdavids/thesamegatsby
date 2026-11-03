import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
import { describe, test } from "node:test";
import { parseTokens, resolveColor, type Rgba } from "../src/design-system/contrast.ts";
import {
  WORDMARK_EM,
  WORDMARK_PATH,
  WORDMARK_SVG,
  WORDMARK_TONES,
} from "../src/design-system/components/Wordmark/outline.ts";

const url = (path: string) => new URL(`../src/design-system/${path}`, import.meta.url);
const read = (path: string) => readFileSync(url(path), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
const tokens = parseTokens(read("tokens.css"), 360);
const css = read("components/Wordmark/Wordmark.module.css");
const asset = read("assets/wordmark.svg");

function declarations(source: string, selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = new RegExp(`(?:^|[\\s}])${escaped}\\s*\\{([^{}]*)\\}`).exec(source);
  assert.ok(match, `no rule for ${selector}`);
  return match[1];
}

// resolveColor reads a token by name, so a value from anywhere else is
// resolved as a stand-in token beside the real ones.
function colour(value: string): Rgba {
  return resolveColor(new Map([...tokens, ["--value", value]]), "--value");
}

function fill(className: string): Rgba {
  const match = /(?<![\w-])fill:\s*([^;]+)/.exec(declarations(css, `.${className}`));
  assert.ok(match, `.${className} has no fill`);
  return colour(match[1].trim());
}

type Shadow = { x: number; y: number; colour: Rgba };

// A text-shadow list as tokens.css writes one, "Xem Yem 0 colour" with
// commas between, leaving the commas inside color-mix() alone.
function shadows(name: string): Shadow[] {
  const value = tokens.get(name);
  assert.ok(value, `${name} isn't defined`);
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < value.length; i++) {
    if (value[i] === "(") depth++;
    else if (value[i] === ")") depth--;
    else if (value[i] === "," && depth === 0) {
      parts.push(value.slice(start, i));
      start = i + 1;
    }
  }
  parts.push(value.slice(start));
  return parts.map((part) => {
    const match = /^\s*(-?[\d.]+)em (-?[\d.]+)em 0 (.+?)\s*$/.exec(part);
    assert.ok(match, `${name}: can't read "${part}"`);
    return { x: Number(match[1]), y: Number(match[2]), colour: colour(match[3]) };
  });
}

// The copies behind the face, as em offsets and colours. text-shadow paints
// its first shadow on top, so they're read front to back to compare.
function behindFace(tone: keyof typeof WORDMARK_TONES): Shadow[] {
  return WORDMARK_TONES[tone]
    .slice(0, -1)
    .reverse()
    .map((copy) => ({ x: copy.x / WORDMARK_EM, y: copy.y / WORDMARK_EM, colour: fill(copy.fill) }));
}

// The path's extent, from every point it names. Control points bound a
// quadratic curve, so the ink lies inside this box.
function extent(d: string) {
  const tokens = d.match(/[A-Za-z]|-?\d+(?:\.\d+)?/g) ?? [];
  const xs: number[] = [];
  const ys: number[] = [];
  const pairs: Record<string, number> = { M: 1, L: 1, Q: 2 };
  let command = "";
  for (let i = 0; i < tokens.length; ) {
    if (/[A-Za-z]/.test(tokens[i])) {
      command = tokens[i++];
      assert.match(command, /^[MLHVQZ]$/, `the path uses ${command}, which this test can't read`);
      continue;
    }
    if (command === "H") xs.push(Number(tokens[i++]));
    else if (command === "V") ys.push(Number(tokens[i++]));
    else {
      for (let pair = 0; pair < pairs[command]; pair++) {
        xs.push(Number(tokens[i++]));
        ys.push(Number(tokens[i++]));
      }
    }
  }
  return { left: Math.min(...xs), top: Math.min(...ys), right: Math.max(...xs), bottom: Math.max(...ys) };
}

function attribute(element: string, name: string): string | undefined {
  return new RegExp(`\\s${name}="([^"]*)"`).exec(element)?.[1];
}

describe("Wordmark", () => {
  test("is named Déjà Gatsby for assistive tech", () => {
    assert.equal(WORDMARK_SVG.role, "img");
    assert.equal(WORDMARK_SVG["aria-label"], "Déjà Gatsby");
  });

  test("is one em tall on a viewBox one em high, so its font units are em values", () => {
    const [, , width, height] = WORDMARK_SVG.viewBox.split(" ").map(Number);
    assert.equal(height, WORDMARK_EM);
    assert.equal(WORDMARK_SVG.height, "1em");
    assert.equal(WORDMARK_SVG.width, `${width / WORDMARK_EM}em`);
  });

  test("draws the screen tone as --dg-tape: its shadows at the token's em offsets", () => {
    assert.deepEqual(behindFace("screen"), shadows("--dg-tape"));
  });

  test("draws the screen tone's face in --dg-fg, unshifted", () => {
    const face = WORDMARK_TONES.screen.at(-1);
    assert.deepEqual({ x: face?.x, y: face?.y }, { x: 0, y: 0 });
    assert.deepEqual(fill(face?.fill ?? ""), resolveColor(tokens, "--dg-fg"));
  });

  test("draws the artwork tone as --dg-tape-artwork, under a --dg-white face", () => {
    assert.deepEqual(behindFace("artwork"), shadows("--dg-tape-artwork"));
    const face = WORDMARK_TONES.artwork.at(-1);
    assert.deepEqual({ x: face?.x, y: face?.y }, { x: 0, y: 0 });
    assert.deepEqual(fill(face?.fill ?? ""), resolveColor(tokens, "--dg-white"));
  });
});

describe("Wordmark.module.css", () => {
  test("sizes xl and l with the display type tokens", () => {
    assert.match(declarations(css, ".xl"), /font-size:\s*var\(--dg-text-display-xl\)/);
    assert.match(declarations(css, ".l"), /font-size:\s*var\(--dg-text-display-l\)/);
  });

  test("lets the slant and the tape draw outside the box, as they do on type", () => {
    assert.match(declarations(css, ".wordmark"), /overflow:\s*visible/);
  });
});

describe("wordmark.svg", () => {
  const uses = asset.match(/<use\s[^>]*>/g) ?? [];

  test("is under 6 KB", () => {
    const bytes = statSync(url("assets/wordmark.svg")).size;
    assert.ok(bytes < 6 * 1024, `the file is ${bytes} bytes`);
  });

  test("is titled Déjà Gatsby", () => {
    assert.match(asset, /<title>Déjà Gatsby<\/title>/);
  });

  test("draws the component's path once, in three uses", () => {
    assert.equal(asset.match(/<path\s/g)?.length, 1);
    assert.ok(asset.includes(`d="${WORDMARK_PATH}"`), "the path differs from the component's");
    assert.equal(uses.length, 3);
  });

  test("places the copies as the screen tone does, back to front", () => {
    const offsets = uses.map((use) => ({ x: Number(attribute(use, "x") ?? 0), y: Number(attribute(use, "y") ?? 0) }));
    assert.deepEqual(offsets, WORDMARK_TONES.screen.map(({ x, y }) => ({ x, y })));
  });

  test("bakes in the screen tone's colours, so it shows outside the page", () => {
    const baked = uses.map((use) => {
      const hex = /^#([0-9a-f]{6})$/i.exec(attribute(use, "fill") ?? "");
      assert.ok(hex, `${use} has no hex fill`);
      const [r, g, b] = [0, 2, 4].map((at) => parseInt(hex[1].slice(at, at + 2), 16));
      return { r, g, b, a: Number(attribute(use, "fill-opacity") ?? 1) };
    });
    assert.deepEqual(baked, WORDMARK_TONES.screen.map((copy) => fill(copy.fill)));
  });

  test("has a viewBox that holds every copy, so nothing is clipped", () => {
    const [left, top, width, height] = (attribute(asset, "viewBox") ?? "").split(" ").map(Number);
    const ink = extent(WORDMARK_PATH);
    for (const { x, y } of WORDMARK_TONES.screen) {
      assert.ok(ink.left + x >= left && ink.top + y >= top, `the copy at ${x}, ${y} is clipped top or left`);
      assert.ok(ink.right + x <= left + width && ink.bottom + y <= top + height, `the copy at ${x}, ${y} is clipped bottom or right`);
    }
  });
});
