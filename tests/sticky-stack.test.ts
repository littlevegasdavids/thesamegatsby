import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";

const read = (path: string) =>
  readFileSync(new URL(`../src/${path}`, import.meta.url), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
const tokens = read("design-system/tokens.css");
const [phone, wide] = tokens.split("@media (min-width: 768px)");
const px = (source: string, name: string) => Number(new RegExp(`${name}:\\s*(\\d+)px;`).exec(source)?.[1] ?? Number.NaN);

// Each layer's top is the sum of the layers above it, in CSS (plan.md).
describe("the sticky stack's tokens", () => {
  test("stacks the filter one gap under the header, and a release one gap under the filter", () => {
    assert.match(tokens, /--dg-sticky-filter:\s*calc\(var\(--dg-header-inset\) \+ var\(--dg-header-h\) \+ var\(--dg-sticky-gap\)\);/);
    assert.match(tokens, /--dg-sticky-release:\s*calc\(var\(--dg-sticky-filter\) \+ var\(--dg-filter-h\) \+ var\(--dg-sticky-gap\)\);/);
  });

  test("puts the stuck release at 142 px on a phone and 166 px from 768 px", () => {
    const at = (s: string, fallback: string) => (name: string) => px(s, name) || px(fallback, name);
    const p = at(phone, phone), w = at(wide, phone);
    assert.equal(p("--dg-header-inset") + p("--dg-header-h") + p("--dg-sticky-gap") * 2 + p("--dg-filter-h"), 142);
    assert.equal(w("--dg-header-inset") + w("--dg-header-h") + w("--dg-sticky-gap") * 2 + w("--dg-filter-h"), 166);
  });

  test("clears the whole stack, a stuck release included, for scroll padding", () => {
    assert.match(tokens, /--dg-sticky-clear:\s*calc\(var\(--dg-sticky-release\) \+ var\(--dg-release-h\) \+ var\(--dg-sticky-gap\)\);/);
    assert.equal(px(phone, "--dg-release-h"), 72);
    assert.equal(px(wide, "--dg-release-h"), 80);
  });
});

describe("the /system stack", () => {
  const frame = read("app/system/SystemFrame.module.css");
  const stack = read("app/system/sections/StickyStack.tsx").replace(/\/\/.*$/gm, "");

  test("pads the frame's scroller by the stack's reach, so focus never lands beneath it", () => {
    assert.match(frame, /\.scroller\s*\{[^}]*scroll-padding-top:\s*var\(--dg-sticky-clear\);/);
  });

  test("puts the filter and the rows straight in the discography, so the filter sticks through it", () => {
    assert.match(stack, /<section data-discography[^>]*>\s*<ReleaseFilter\b/);
    assert.match(stack, /shown\.map\(\(release\) => \(\s*<div key=\{release\.id\} data-release=\{release\.id\}>\s*<ReleaseRow\b/);
  });

  test("puts the header in the page's own column, so it sticks through the whole frame", () => {
    assert.match(stack, /<div ref=\{page\} className=\{styles\.framePage\}>\s*<SiteHeader\b/);
  });
});
