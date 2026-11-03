import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
import { describe, test } from "node:test";
import { parseTokens, resolveColor } from "../src/design-system/contrast.ts";
import { STAR_PATH, STAR_VIEWBOX, starA11y } from "../src/design-system/components/SparkleStar/star.ts";

const url = (path: string) => new URL(`../src/design-system/${path}`, import.meta.url);
const read = (path: string) => readFileSync(url(path), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
const css = read("components/SparkleStar/SparkleStar.module.css");
const asset = read("assets/sparkle-star.svg");

function declarations(source: string, selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = new RegExp(`(?:^|[\\s}])${escaped}\\s*\\{([^{}]*)\\}`).exec(source);
  assert.ok(match, `no rule for ${selector}`);
  return match[1];
}

function atRule(source: string, prelude: string): string {
  const start = source.indexOf(prelude);
  assert.ok(start >= 0, `no ${prelude} block`);
  let depth = 0;
  for (let i = source.indexOf("{", start); i < source.length; i++) {
    if (source[i] === "{") depth++;
    if (source[i] === "}" && --depth === 0) return source.slice(source.indexOf("{", start) + 1, i);
  }
  throw new Error(`${prelude} block isn't closed`);
}

describe("starA11y", () => {
  test("hides the star from assistive tech by default", () => {
    assert.deepEqual(starA11y(), { "aria-hidden": true });
  });

  test("makes a labelled star an image with that name", () => {
    assert.deepEqual(starA11y("Now playing"), { role: "img", "aria-label": "Now playing" });
  });

  test("treats an empty label as no label, so the star never becomes a nameless image", () => {
    assert.deepEqual(starA11y(""), { "aria-hidden": true });
  });
});

describe("sparkle-star.svg", () => {
  test("is under 1 KB", () => {
    const bytes = statSync(url("assets/sparkle-star.svg")).size;
    assert.ok(bytes < 1024, `the file is ${bytes} bytes`);
  });

  test("draws the component's path on its viewBox", () => {
    assert.match(asset, new RegExp(`viewBox="${STAR_VIEWBOX}"`));
    assert.equal(asset.match(/<path /g)?.length, 1);
    assert.ok(asset.includes(`d="${STAR_PATH}"`), "the path differs from the component's");
  });

  test("is filled with --dg-star, baked in so it shows outside the page", () => {
    const fill = /fill="#([0-9a-f]{6})"/i.exec(asset);
    assert.ok(fill, "the file has no hex fill");
    const [r, g, b] = [0, 2, 4].map((at) => parseInt(fill[1].slice(at, at + 2), 16));
    assert.deepEqual({ r, g, b, a: 1 }, resolveColor(parseTokens(read("tokens.css"), 360), "--dg-star"));
  });
});

describe("SparkleStar.module.css", () => {
  test("colours the star with --dg-star, which a parent can override", () => {
    assert.match(declarations(css, ".star"), /(?<!-)color:\s*var\(--dg-star\)/);
  });

  test("twinkles in steps, not a smooth ease", () => {
    const twinkle = declarations(css, ".twinkle");
    assert.match(twinkle, /animation:\s*dg-star-twinkle\s/);
    assert.match(twinkle, /steps\(/);
  });

  test("animates opacity and transform alone, so a frame never repaints", () => {
    const keyframes = atRule(css, "@keyframes dg-star-twinkle");
    const animated = [...keyframes.matchAll(/([\w-]+)\s*:/g)].map((match) => match[1]);
    assert.deepEqual([...new Set(animated)].sort(), ["opacity", "transform"]);
  });

  test("holds still under reduced motion", () => {
    const reduced = atRule(css, "@media (prefers-reduced-motion: reduce)");
    assert.match(declarations(reduced, ".twinkle"), /animation:\s*none/);
  });
});
