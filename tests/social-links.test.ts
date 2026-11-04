import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";
import { parseTokens, tokenContrast } from "../src/design-system/contrast.ts";
import {
  FOOTER_HEADING,
  orderSocials,
  socialHandle,
  socialName,
} from "../src/design-system/components/SocialLinks/networks.ts";
import type { SocialLink } from "../src/design-system/types.ts";

const read = (path: string) =>
  readFileSync(new URL(`../src/design-system/${path}`, import.meta.url), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
const css = read("components/SocialLinks/SocialLinks.module.css");
const tsx = read("components/SocialLinks/SocialLinks.tsx").replace(/\/\/.*$/gm, "");
const tokens = parseTokens(read("tokens.css"), 360);

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

const HOVER = block(css, "@media (hover: hover)");
const REST = css.replace(`@media (hover: hover) {${HOVER}}`, "");

const rules = (source: string) =>
  [...source.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, selectors, body]) => ({
    selectors: selectors.split(",").map((s) => s.trim()),
    body,
  }));

function value(source: string, selector: string, property: string): string | undefined {
  const found = rules(source)
    .filter((r) => r.selectors.includes(selector))
    .flatMap(({ body }) => [...body.matchAll(/([\w-]+)\s*:\s*([^;]+)/g)].filter(([, name]) => name === property))
    .map(([, , v]) => v.trim());
  assert.ok(found.length <= 1, `${selector} sets ${property} ${found.length} times`);
  return found[0];
}

const px = (v: string | undefined) => Number(/^(\d+)px$/.exec(v ?? "")?.[1] ?? Number.NaN);

const INSTAGRAM: SocialLink = { network: "instagram", handle: "thesamegatsby", url: "https://www.instagram.com/thesamegatsby" };
const TIKTOK: SocialLink = { network: "tiktok", handle: "thesamegatsby", url: "https://www.tiktok.com/@thesamegatsby" };

describe("the social networks", () => {
  test("come Instagram first, then TikTok, whatever order they're given in", () => {
    assert.deepEqual(orderSocials([TIKTOK, INSTAGRAM]), [INSTAGRAM, TIKTOK]);
  });

  test("keep the first link when a network is listed twice", () => {
    assert.deepEqual(orderSocials([INSTAGRAM, { ...INSTAGRAM, url: "https://example.com" }]), [INSTAGRAM]);
  });

  test("show the handle with one @", () => {
    assert.equal(socialHandle(INSTAGRAM), "@thesamegatsby");
    assert.equal(socialHandle({ ...INSTAGRAM, handle: "@thesamegatsby" }), "@thesamegatsby");
  });

  test("are named for the network, with the handle where it shows", () => {
    assert.equal(socialName(INSTAGRAM, false), "Instagram");
    assert.equal(socialName(TIKTOK, false), "TikTok");
    assert.equal(socialName(INSTAGRAM, true), "Instagram: @thesamegatsby");
    assert.equal(socialName(TIKTOK, true), "TikTok: @thesamegatsby");
  });

  test("head the footer block as the canvas does", () => {
    assert.equal(FOOTER_HEADING, "Follow the signal");
  });
});

describe("SocialLinks' markup", () => {
  test("opens every link in a new tab with rel=noopener", () => {
    const anchors = [...tsx.matchAll(/<a\b[^>]*>/g)].map(([a]) => a);
    assert.equal(anchors.length, 1);
    assert.match(anchors[0], /target="_blank"/);
    assert.match(anchors[0], /rel="noopener"/);
  });

  test("names each link, with the handle only in the handles variant", () => {
    assert.match(tsx, /aria-label=\{socialName\(link, variant === "handles"\)\}/);
  });

  test("puts the header variants in a nav named Social, and labels the footer by its heading", () => {
    assert.match(tsx, /<nav aria-label="Social"/);
    assert.match(tsx, /<nav aria-labelledby=\{headingId\}/);
    assert.match(tsx, /<h2 id=\{headingId\}/);
  });

  test("draws each network's mark, hidden from assistive tech, at 20 px", () => {
    assert.match(tsx, /<PlatformIcon icon=\{link\.network\} size=\{20\} \/>/);
  });

  test("shows the handle in the handles variant only, and the name in the footer", () => {
    assert.match(tsx, /variant === "handles" && <span className=\{styles\.handle\}>\{socialHandle\(link\)\}<\/span>/);
    assert.match(tsx, /variant === "footer" && SOCIAL_LABELS\[link\.network\]/);
  });

  test("is a server component: it holds no state", () => {
    assert.doesNotMatch(tsx, /"use client"|useState/);
  });
});

describe("SocialLinks' layout", () => {
  test("makes every target 44 px or more", () => {
    assert.equal(px(value(REST, ".icons .link", "width")), 44);
    assert.equal(px(value(REST, ".icons .link", "height")), 44);
    assert.ok(px(value(REST, ".link", "min-height")) >= 44);
  });

  test("sets the handle in VT323 at the readout size", () => {
    assert.equal(value(REST, ".handle", "font-family"), "var(--dg-font-readout)");
    assert.equal(value(REST, ".handle", "font-size"), "var(--dg-text-readout)");
  });

  test("lays the footer out as two equal outlined buttons", () => {
    assert.equal(value(REST, ".footer .list", "grid-template-columns"), "repeat(2, minmax(0, 1fr))");
    assert.equal(value(REST, ".footer .link", "border"), "1px solid var(--dg-outline)");
  });

  test("heads the footer like the other section labels", () => {
    assert.equal(value(REST, ".heading", "font-size"), "var(--dg-text-label)");
    assert.equal(value(REST, ".heading", "color"), "var(--dg-fg-muted)");
  });
});

describe("SocialLinks' states", () => {
  test("rings keyboard focus in --dg-focus, 2 px out", () => {
    const rule = rules(REST).find((r) => r.selectors.includes(".link:focus-visible"));
    assert.ok(rule);
    assert.match(rule.body, /outline:\s*2px solid var\(--dg-focus\)/);
    assert.match(rule.body, /outline-offset:\s*2px/);
  });

  test("hovers only where there's a real pointer", () => {
    assert.doesNotMatch(REST, /:hover/);
  });

  test("turns the header links' text amber on hover, and the footer's border too", () => {
    assert.equal(value(HOVER, ".link:hover", "color"), "var(--dg-accent)");
    assert.equal(value(HOVER, ".footer .link:hover", "border-color"), "var(--dg-accent)");
  });

  test("snaps, with no transition or animation", () => {
    assert.doesNotMatch(css, /transition|animation/);
  });
});

describe("SocialLinks' contrast", () => {
  // The header's glass, over the page, and the footer on the page.
  for (const surface of ["--dg-surface-glass", "--dg-bg"]) {
    test(`passes 4.5:1 for the label and its hover on ${surface}`, () => {
      for (const fg of ["--dg-fg", "--dg-accent", "--dg-fg-muted"]) {
        const ratio = tokenContrast(tokens, fg, surface);
        assert.ok(ratio >= 4.5, `${fg} on ${surface}: ${ratio.toFixed(2)}`);
      }
    });
  }

  test("passes 3:1 for the footer's outline and its hovered border", () => {
    for (const line of ["--dg-outline", "--dg-accent"]) assert.ok(tokenContrast(tokens, line, "--dg-bg") >= 3, line);
  });
});
