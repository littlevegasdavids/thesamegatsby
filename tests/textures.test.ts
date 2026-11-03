import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";
import { parseTokens } from "../src/design-system/contrast.ts";

const read = (path: string) =>
  readFileSync(new URL(`../src/design-system/${path}`, import.meta.url), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
const textures = read("textures.css");
const screen = read("components/Screen/Screen.module.css");
const tokens = parseTokens(read("tokens.css"), 360);

// The declarations of the rule written exactly as `selector { … }`, or of
// the at-rule block whose prelude starts with `prelude`.
function declarations(css: string, selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = new RegExp(`(?:^|[\\s}])${escaped}\\s*\\{([^{}]*)\\}`).exec(css);
  assert.ok(match, `no rule for ${selector}`);
  return match[1];
}

function atRule(css: string, prelude: string): string {
  const start = css.indexOf(prelude);
  assert.ok(start >= 0, `no ${prelude} block`);
  let depth = 0;
  for (let i = css.indexOf("{", start); i < css.length; i++) {
    if (css[i] === "{") depth++;
    if (css[i] === "}" && --depth === 0) return css.slice(css.indexOf("{", start) + 1, i);
  }
  throw new Error(`${prelude} block isn't closed`);
}

describe("textures.css", () => {
  test("defines every utility in SPEC-design-system.md › Textures", () => {
    // .dg-backdrop arrives with DS-8.
    for (const utility of ["grain", "scanlines", "halftone", "tape", "glass", "glow", "sticker", "vignette"]) {
      assert.match(textures, new RegExp(`\\.dg-${utility}\\b`), `.dg-${utility} is missing`);
    }
  });

  test("keeps grain at or under 8% opacity, read from its token", () => {
    assert.ok(Number(tokens.get("--dg-grain-opacity")) <= 0.08);
    assert.match(declarations(textures, ".dg-grain::after"), /opacity:\s*var\(--dg-grain-opacity\)/);
  });

  test("draws grain from an inline SVG noise tile under 1 KB, with no blend mode", () => {
    const grain = declarations(textures, ".dg-grain::after");
    const tile = /url\("(data:image\/svg\+xml,[^"]+)"\)/.exec(grain);
    assert.ok(tile, "the grain tile isn't an inline SVG");
    assert.match(decodeURIComponent(tile[1]), /<feTurbulence /);
    assert.ok(tile[1].length < 1024, `the tile is ${tile[1].length} bytes`);
    assert.doesNotMatch(textures, /mix-blend-mode/);
  });

  test("gives glass the glass colour and blur, prefixed for Safari before 18", () => {
    const glass = declarations(textures, ".dg-glass");
    assert.match(glass, /background:\s*var\(--dg-surface-glass\)/);
    assert.match(glass, /-webkit-backdrop-filter:\s*var\(--dg-glass-filter\)/);
    assert.match(glass, /(?<!-)backdrop-filter:\s*var\(--dg-glass-filter\)/);
  });

  test("falls back to solid --dg-surface where backdrop-filter isn't supported", () => {
    const fallback = atRule(textures, "@supports not");
    assert.match(textures, /@supports not \(\(backdrop-filter: .+\) or \(-webkit-backdrop-filter: .+\)\) \{/);
    assert.match(declarations(fallback, ".dg-glass"), /background:\s*var\(--dg-surface\)/);
  });

  test("animates nothing, so reduced motion has nothing to stop", () => {
    assert.doesNotMatch(textures, /animation|transition|@keyframes/);
  });
});

describe("Screen", () => {
  test("clips horizontal overflow with clip, never hidden, so sticky children still stick", () => {
    assert.match(declarations(screen, ".screen"), /overflow-x:\s*clip/);
    assert.doesNotMatch(screen, /overflow(?:-[xy])?:\s*(?:hidden|auto|scroll)/);
  });

  test("pads each side by its safe-area inset", () => {
    const padding = /padding:\s*([^;]+);/.exec(declarations(screen, ".screen"))?.[1] ?? "";
    for (const side of ["top", "right", "bottom", "left"]) {
      assert.match(padding, new RegExp(`env\\(safe-area-inset-${side}\\)`), `no ${side} inset`);
    }
  });

  test("lays grain and vignette as one fixed layer that takes no pointer events", () => {
    const layer = declarations(screen, ".texture");
    assert.match(layer, /position:\s*fixed/);
    assert.match(layer, /inset:\s*0/);
    assert.match(layer, /pointer-events:\s*none/);
    assert.match(layer, /z-index:\s*var\(--dg-z-texture\)/);
  });
});
