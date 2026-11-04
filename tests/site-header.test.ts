import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";

const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "");
const read = (path: string) => strip(readFileSync(new URL(`../src/${path}`, import.meta.url), "utf8"));
const css = read("design-system/components/SiteHeader/SiteHeader.module.css");
const tsx = read("design-system/components/SiteHeader/SiteHeader.tsx").replace(/\/\/.*$/gm, "");
const frameCss = read("app/system/SystemFrame.module.css");
const frameTsx = read("app/system/SystemFrame.tsx").replace(/\/\/.*$/gm, "");
const textures = read("design-system/textures.css");

function block(source: string, header: string): string {
  const start = source.indexOf(header);
  assert.ok(start >= 0, `no ${header}`);
  let depth = 0;
  for (let i = source.indexOf("{", start); i < source.length; i++) {
    if (source[i] === "{") depth++;
    if (source[i] === "}" && --depth === 0) return source.slice(source.indexOf("{", start) + 1, i);
  }
  throw new Error(`${header} isn't closed`);
}

const WIDE = block(css, "@media (min-width: 768px)");
const NARROW = css.replace(`@media (min-width: 768px) {${WIDE}}`, "");

const rules = (source: string) =>
  [...source.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, selectors, body]) => ({
    selectors: selectors.split(",").map((s) => s.trim()),
    body,
  }));

function value(source: string, selector: string, property: string): string | undefined {
  const found = rules(source)
    .filter((r) => r.selectors.includes(selector))
    .flatMap(({ body }) => [...body.matchAll(/([\w-]+)\s*:\s*([^;]+)/g)].filter(([, name]) => name === property))
    .map(([, , v]) => v.trim().replace(/\s+/g, " "));
  assert.ok(found.length <= 1, `${selector} sets ${property} ${found.length} times`);
  return found[0];
}

describe("SiteHeader's markup", () => {
  test("is a <header> on the glass surface, floating by default", () => {
    assert.match(tsx, /<header className=\{`\$\{styles\.header\} \$\{styles\[variant\]\} dg-glass`\}>/);
    assert.match(tsx, /variant = "floating"/);
  });

  test("puts the wordmark at the l size on the left", () => {
    assert.match(tsx, /<Wordmark size="l" \/>/);
    assert.ok(tsx.indexOf("<Wordmark") < tsx.indexOf("<SocialLinks"));
  });

  test("renders the icons and the handles, and CSS shows one at each width", () => {
    assert.match(tsx, /<div className=\{styles\.phone\}>\s*<SocialLinks variant="icons" links=\{socials\} \/>/);
    assert.match(tsx, /<div className=\{styles\.desktop\}>\s*<SocialLinks variant="handles" links=\{socials\} \/>/);
    assert.equal(value(NARROW, ".desktop", "display"), "none");
    assert.equal(value(WIDE, ".phone", "display"), "none");
    assert.equal(value(WIDE, ".desktop", "display"), "block");
  });

  test("holds no state", () => {
    assert.doesNotMatch(tsx, /"use client"|useState|useEffect/);
  });
});

describe("SiteHeader's box", () => {
  test("sticks to the top at the header inset, and the bar at 0", () => {
    assert.equal(value(NARROW, ".header", "position"), "sticky");
    assert.equal(value(NARROW, ".header", "top"), "var(--dg-header-inset)");
    assert.equal(value(NARROW, ".bar", "top"), "0");
  });

  test("stays in flow at the token height, so the page reserves it", () => {
    assert.equal(value(NARROW, ".header", "height"), "var(--dg-header-h)");
    assert.equal(value(NARROW, ".header", "box-sizing"), "border-box");
    assert.doesNotMatch(css, /position:\s*(fixed|absolute)/);
  });

  test("floats inset by the header inset on a phone, and spans its parent from 768 px", () => {
    assert.equal(value(NARROW, ".header", "margin"), "var(--dg-header-inset) var(--dg-header-inset) 0");
    assert.equal(value(WIDE, ".header", "margin-inline"), "0");
    assert.equal(value(NARROW, ".bar", "margin"), "0");
  });

  test("draws the floating box: 12 px radius, hairline border, the floating shadow", () => {
    assert.equal(value(NARROW, ".header", "border-radius"), "var(--dg-radius-l)");
    assert.equal(value(NARROW, ".header", "border"), "1px solid var(--dg-line)");
    assert.equal(value(NARROW, ".header", "box-shadow"), "var(--dg-shadow-float)");
  });

  test("turns into a bar with only a bottom hairline and square corners", () => {
    assert.equal(value(NARROW, ".bar", "border-width"), "0 0 1px");
    assert.equal(value(NARROW, ".bar", "border-radius"), "var(--dg-radius-0)");
  });

  test("pads as the boards do: 0 4 0 16 px on a phone, 8 12 8 24 px from 768", () => {
    assert.equal(value(NARROW, ".header", "padding"), "0 var(--dg-space-1) 0 var(--dg-space-4)");
    assert.equal(value(WIDE, ".header", "padding"), "var(--dg-space-2) var(--dg-space-3) var(--dg-space-2) var(--dg-space-5)");
  });

  test("leaves its surface to .dg-glass, whose fallback is solid --dg-surface", () => {
    assert.doesNotMatch(css, /background/);
    const fallback = block(textures, "@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px)))");
    assert.match(fallback, /\.dg-glass\s*\{\s*background:\s*var\(--dg-surface\);/);
  });

  test("sits on the bar layer, under the grain", () => {
    assert.equal(value(NARROW, ".header", "z-index"), "var(--dg-z-bar)");
  });

  test("never clips, so nothing inside it is cut and nothing stops it sticking", () => {
    assert.doesNotMatch(css, /overflow/);
  });
});

describe("SystemFrame", () => {
  test("contains layout and paint on a box that doesn't scroll, so fixed children stay put", () => {
    assert.equal(value(frameCss, ".frame", "contain"), "layout paint");
    assert.equal(value(frameCss, ".frame", "overflow"), undefined);
  });

  test("scrolls an inner box, which a sticky header sticks to", () => {
    assert.equal(value(frameCss, ".scroller", "overflow-y"), "auto");
    assert.equal(value(frameCss, ".scroller", "height"), "100%");
  });

  test("is a fixed height, set through a custom property", () => {
    assert.equal(value(frameCss, ".frame", "height"), "var(--frame-h)");
    assert.match(frameTsx, /style=\{\{ "--frame-h": `\$\{height\}px` \} as CSSProperties\}/);
  });

  test("starts at the scroll offset it's given, and can be scrolled by keyboard", () => {
    assert.match(frameTsx, /scroller\.scrollTop = scrollTop/);
    assert.match(frameTsx, /tabIndex=\{0\}/);
    assert.match(frameTsx, /role="region"/);
    assert.match(frameTsx, /aria-label=\{label\}/);
  });

  test("carries its own drifting grid behind the content", () => {
    assert.match(frameTsx, /className=\{`\$\{styles\.backdrop\} dg-backdrop`\} aria-hidden="true"/);
    assert.equal(value(frameCss, ".backdrop", "position"), "absolute");
  });
});
