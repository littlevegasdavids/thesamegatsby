import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";
import { parseTokens, tokenContrast } from "../src/design-system/contrast.ts";

const read = (path: string) =>
  readFileSync(new URL(`../src/design-system/${path}`, import.meta.url), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
const css = read("components/StreamLinks/StreamLinks.module.css");
const tsx = read("components/StreamLinks/StreamLinks.tsx").replace(/\/\/.*$/gm, "");
const tokens = parseTokens(read("tokens.css"), 360);

// The text inside one at-rule's braces, matched by depth.
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
const HOVER = block(css, "@media (hover: hover)");
const NARROW = css.replace(`@media (min-width: 768px) {${WIDE}}`, "").replace(`@media (hover: hover) {${HOVER}}`, "");

// Every rule in a stretch of CSS, as its selectors and body.
const rules = (source: string) =>
  [...source.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, selectors, body]) => ({
    selectors: selectors.split(",").map((s) => s.trim()),
    body,
  }));

// The one value `property` takes in the rule that lists exactly `selector`.
function value(source: string, selector: string, property: string): string | undefined {
  const found = rules(source)
    .filter((r) => r.selectors.includes(selector))
    .flatMap(({ body }) => [...body.matchAll(/([\w-]+)\s*:\s*([^;]+)/g)].filter(([, name]) => name === property))
    .map(([, , v]) => v.trim());
  assert.ok(found.length <= 1, `${selector} sets ${property} ${found.length} times`);
  return found[0];
}

const px = (v: string | undefined) => Number(/^(\d+)px$/.exec(v ?? "")?.[1] ?? Number.NaN);

describe("StreamLinks' markup", () => {
  test("is a client component, for the More disclosure's state", () => {
    assert.match(tsx, /^\s*"use client";/);
    assert.match(tsx, /useState\(defaultOpen\)/);
  });

  test("puts the links in the fixed order through splitLinks", () => {
    assert.match(tsx, /splitLinks\(links\)/);
  });

  test("opens every link in a new tab with rel=noopener", () => {
    const anchors = [...tsx.matchAll(/<a\b[^>]*>/g)].map(([a]) => a);
    assert.ok(anchors.length > 0);
    for (const a of anchors) {
      assert.match(a, /target="_blank"/);
      assert.match(a, /rel="noopener"/);
    }
  });

  test("names every link with the platform's full label", () => {
    for (const a of [...tsx.matchAll(/<a\b[^>]*>/g)].map(([a]) => a)) {
      assert.match(a, /aria-label=\{label\}/);
    }
    assert.match(tsx, /const \{ label, short \} = PLATFORMS\[link\.platform\];/);
  });

  test("makes More a button with aria-expanded and aria-controls, rendered only with extras", () => {
    assert.match(tsx, /more\.length > 0 &&/);
    const toggle = /<button\b[^>]*className=\{[^}]*toggle[^}]*\}[^>]*>/s.exec(tsx)?.[0] ?? "";
    assert.match(toggle, /type="button"/);
    assert.match(toggle, /aria-expanded=\{open\}/);
    assert.match(toggle, /aria-controls=/);
  });

  test("reads More while closed and Less while open", () => {
    assert.match(tsx, /open \? "Less" : "More"/);
  });

  test("keeps the extras in the page but hidden while closed, so aria-controls always points somewhere", () => {
    assert.match(tsx, /hidden=\{!open\}/);
    assert.equal(value(NARROW, ".more[hidden]", "display"), "none");
  });

  test("labels the group with its heading, and is never a live region", () => {
    assert.match(tsx, /role="group"/);
    assert.match(tsx, /aria-labelledby=\{headingId\}/);
    assert.doesNotMatch(tsx, /aria-live|role="(status|alert|log)"/);
  });

  test("adds the sparkle to the heading only when emphasised", () => {
    assert.match(tsx, /\{emphasis && <SparkleStar size=\{12\} \/>\}/);
  });

  test("takes emphasis only on the bar", () => {
    assert.match(tsx, /variant: "bar"; emphasis\?: boolean/);
    assert.match(tsx, /variant: "chips"; emphasis\?: never/);
  });
});

describe("StreamLinks' layout", () => {
  test("gives the bar five equal columns below 768 px, and the extras three", () => {
    assert.equal(value(NARROW, ".main", "grid-template-columns"), "repeat(5, minmax(0, 1fr))");
    assert.equal(value(NARROW, ".more", "grid-template-columns"), "repeat(3, minmax(0, 1fr))");
  });

  test("keeps every target 44 px or more", () => {
    assert.ok(px(value(NARROW, ".link", "min-height")) >= 44, "link");
    assert.ok(px(value(NARROW, ".toggle", "min-height")) >= 44, "toggle");
    assert.equal(px(value(NARROW, ".main .link", "height")), 58, "phone bar button, as the board draws it with its border");
    assert.equal(px(value(NARROW, ".more .link", "height")), 50, "phone extra, likewise");
    assert.equal(px(value(WIDE, ".main .link", "height")), 44, "desktop bar button");
  });

  test("sets the platform names under the phone bar's icons in --dg-text-micro, and nowhere else", () => {
    assert.equal(value(NARROW, ".main .link", "font-size"), "var(--dg-text-micro)");
    assert.equal(css.match(/--dg-text-micro/g)?.length, 1);
    assert.equal(value(WIDE, ".main .link", "font-size"), "var(--dg-text-small)");
  });

  test("shows the short labels below 768 px and the full ones from it", () => {
    assert.equal(value(NARROW, ".full", "display"), "none");
    assert.equal(value(WIDE, ".short", "display"), "none");
    assert.equal(value(WIDE, ".full", "display"), "inline");
  });

  test("lays the bar out in one wrapping row from 768 px", () => {
    assert.equal(value(WIDE, ".bar", "display"), "flex");
    assert.equal(value(WIDE, ".bar", "flex-wrap"), "wrap");
  });

  test("shows the chips as one wrapping list", () => {
    assert.equal(value(NARROW, ".chipList", "display"), "flex");
    assert.equal(value(NARROW, ".chipList", "flex-wrap"), "wrap");
  });
});

describe("StreamLinks' states", () => {
  test("rings keyboard focus in --dg-focus, 2 px out, on links and the toggle", () => {
    for (const selector of [".link:focus-visible", ".toggle:focus-visible"]) {
      const rule = rules(NARROW).find((r) => r.selectors.includes(selector));
      assert.ok(rule, selector);
      assert.match(rule.body, /outline:\s*2px solid var\(--dg-focus\)/);
      assert.match(rule.body, /outline-offset:\s*2px/);
    }
  });

  test("fills the five bar buttons amber when emphasised", () => {
    assert.equal(value(NARROW, ".emphasis .main .link", "background-color"), "var(--dg-accent)");
    assert.equal(value(NARROW, ".emphasis .main .link", "border-color"), "var(--dg-accent)");
    assert.equal(value(NARROW, ".emphasis .main .link", "color"), "var(--dg-on-accent)");
    assert.equal(value(NARROW, ".emphasis .heading", "color"), "var(--dg-accent)");
  });

  test("hovers only where there's a real pointer", () => {
    assert.doesNotMatch(NARROW + WIDE, /:hover/);
  });

  test("turns border and text amber on hover, and lights an emphasised button instead", () => {
    assert.equal(value(HOVER, ".link:hover", "color"), "var(--dg-accent)");
    assert.equal(value(HOVER, ".link:hover", "border-color"), "var(--dg-accent)");
    assert.equal(value(HOVER, ".toggle:hover", "color"), "var(--dg-accent)");
    assert.equal(value(HOVER, ".emphasis .main .link:hover", "box-shadow"), "var(--dg-glow-accent-box)");
    assert.equal(value(HOVER, ".emphasis .main .link:hover", "color"), "var(--dg-on-accent)");
  });

  test("snaps between states, with no transition or animation", () => {
    assert.doesNotMatch(css, /transition|animation/);
  });
});

describe("StreamLinks' contrast", () => {
  // The bar sits on --dg-surface-raised, the chips on the page.
  const SURFACES = ["--dg-surface-raised", "--dg-bg"];

  for (const surface of SURFACES) {
    test(`passes 4.5:1 for every label on ${surface}`, () => {
      for (const fg of ["--dg-fg", "--dg-fg-muted", "--dg-accent"]) {
        const ratio = tokenContrast(tokens, fg, surface);
        assert.ok(ratio >= 4.5, `${fg} on ${surface}: ${ratio.toFixed(2)}`);
      }
    });

    test(`passes 3:1 for the outline and the hovered border on ${surface}`, () => {
      for (const line of ["--dg-outline", "--dg-accent"]) {
        const ratio = tokenContrast(tokens, line, surface);
        assert.ok(ratio >= 3, `${line} on ${surface}: ${ratio.toFixed(2)}`);
      }
    });
  }

  test("passes 4.5:1 for an emphasised button's label", () => {
    assert.ok(tokenContrast(tokens, "--dg-on-accent", "--dg-accent") >= 4.5);
  });
});
