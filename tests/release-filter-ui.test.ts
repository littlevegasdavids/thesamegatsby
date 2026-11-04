import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";
import { parseTokens, tokenContrast } from "../src/design-system/contrast.ts";
import { filterLabel, moveActive, revealOffset } from "../src/design-system/components/ReleaseFilter/listbox.ts";
import type { FilterOption } from "../src/design-system/release-filter.ts";

const read = (path: string) =>
  readFileSync(new URL(`../src/design-system/${path}`, import.meta.url), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
const css = read("components/ReleaseFilter/ReleaseFilter.module.css");
const tsx = read("components/ReleaseFilter/ReleaseFilter.tsx").replace(/\/\/.*$/gm, "");

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

const ALL: FilterOption = { key: "all", label: "All", count: 8 };
const SINGLES: FilterOption = { key: "single", label: "Singles", count: 4 };

describe("ReleaseFilter's words and keys", () => {
  test("calls All 'All releases' in the phone dropdown and 'All' on the desktop buttons", () => {
    assert.equal(filterLabel(ALL, "menu"), "All releases");
    assert.equal(filterLabel(ALL, "buttons"), "All");
    assert.equal(filterLabel(SINGLES, "menu"), "Singles");
    assert.equal(filterLabel(SINGLES, "buttons"), "Singles");
  });

  test("moves through the options with the arrows, Home and End, held at the ends", () => {
    assert.equal(moveActive(0, "ArrowDown", 5), 1);
    assert.equal(moveActive(4, "ArrowDown", 5), 4);
    assert.equal(moveActive(2, "ArrowUp", 5), 1);
    assert.equal(moveActive(0, "ArrowUp", 5), 0);
    assert.equal(moveActive(3, "Home", 5), 0);
    assert.equal(moveActive(1, "End", 5), 4);
    assert.equal(moveActive(2, "Enter", 5), null);
  });
});

describe("revealOffset, which keeps a focused desktop button in its row's view", () => {
  // A 412 px row, as at 768 px, with the focus ring reaching 4 px out.
  test("leaves the row alone when the button and its ring already show", () => {
    assert.equal(revealOffset(0, 412, 293, 110, 4), 0);
  });

  test("scrolls a button cut by the right edge in, ring and all", () => {
    // "Remixes & edits" at 411–586 shows 1 px. Browsers leave a partly
    // shown element where it is on focus, so the row has to move itself.
    assert.equal(revealOffset(0, 412, 411, 175, 4), 178);
  });

  test("scrolls a button cut by the left edge back in, ring and all", () => {
    assert.equal(revealOffset(178, 412, 88, 112, 4), 84);
  });

  test("never asks for a scroll before the row's start", () => {
    assert.equal(revealOffset(178, 412, 2, 76, 4), 0);
  });
});

describe("ReleaseFilter's markup", () => {
  test("is a client component, for the open list and the active option", () => {
    assert.match(tsx, /^\s*"use client";/);
    assert.match(tsx, /useState\(defaultOpen\)/);
  });

  test("makes the trigger a button that pops up a listbox", () => {
    const trigger = /<button\b[^>]*aria-haspopup="listbox"[^>]*>/s.exec(tsx)?.[0] ?? "";
    assert.match(trigger, /type="button"/);
    assert.match(trigger, /aria-expanded=\{open\}/);
    assert.match(trigger, /aria-labelledby=/);
  });

  test("opens a listbox of options, the selected one marked, the active one by aria-activedescendant", () => {
    assert.match(tsx, /role="listbox"/);
    assert.match(tsx, /aria-activedescendant=/);
    assert.match(tsx, /role="option"/);
    assert.match(tsx, /aria-selected=\{option\.key === selected\}/);
  });

  test("handles Enter, Space, Escape and Tab on the list, and returns focus to the trigger", () => {
    for (const key of ['"Enter"', '" "', '"Escape"', '"Tab"']) assert.ok(tsx.includes(key), key);
    assert.match(tsx, /triggerRef\.current\?\.focus\(\)/);
  });

  test("makes the desktop row a group of pressed buttons", () => {
    assert.match(tsx, /role="group"/);
    assert.match(tsx, /aria-pressed=\{option\.key === selected\}/);
  });

  test("scrolls a focused desktop button into the row's view", () => {
    const button = /<button\b[^>]*className=\{styles\.button\}[^>]*>/s.exec(tsx)?.[0] ?? "";
    assert.match(button, /onFocus=\{/);
    assert.match(tsx, /revealOffset\(/);
  });

  test("hides every glyph from assistive tech, and is no live region", () => {
    for (const svg of tsx.match(/<svg\b[^>]*>/g) ?? []) assert.match(svg, /aria-hidden/);
    assert.doesNotMatch(tsx, /aria-live/);
  });

  test("renders the heading and the box as siblings, so the box sticks through the whole list", () => {
    assert.match(tsx, /return \(\s*<>/);
  });
});

describe("ReleaseFilter's layout", () => {
  test("sticks the box under the header, on the glass, contained like the header", () => {
    assert.equal(value(NARROW, ".box", "position"), "sticky");
    assert.equal(value(NARROW, ".box", "top"), "var(--dg-sticky-filter)");
    assert.equal(value(NARROW, ".box", "height"), "var(--dg-filter-h)");
    assert.equal(value(NARROW, ".box", "box-sizing"), "border-box");
    assert.equal(value(NARROW, ".box", "border"), "1px solid var(--dg-line)");
    assert.equal(value(NARROW, ".box", "border-radius"), "var(--dg-radius-l)");
    assert.equal(value(NARROW, ".box", "box-shadow"), "var(--dg-shadow-float)");
    assert.equal(value(NARROW, ".box", "margin-bottom"), "var(--dg-sticky-gap)");
    assert.match(tsx, /`\$\{styles\.box\} dg-glass`/);
  });

  test("sits under the header and over the release rows", () => {
    assert.equal(value(NARROW, ".box", "z-index"), "calc(var(--dg-z-bar) - 1)");
  });

  test("shows the dropdown below 768 px and the buttons from it, with the heading outside, then inside", () => {
    assert.equal(value(NARROW, ".buttons", "display"), "none");
    assert.equal(value(WIDE, ".menu", "display"), "none");
    assert.equal(value(WIDE, ".buttons", "display"), "flex");
    assert.equal(value(WIDE, ".outerHeading", "display"), "none");
    assert.equal(value(NARROW, ".innerHeading", "display"), "none");
  });

  test("makes every target 44 px or more, and the options 48 px", () => {
    assert.equal(px(value(NARROW, ".trigger", "height")), 44);
    assert.equal(px(value(NARROW, ".option", "height")), 48);
    assert.equal(px(value(NARROW, ".button", "height")), 44);
  });

  test("keeps the desktop row one line, scrolling sideways if it must, so its height holds", () => {
    assert.equal(value(NARROW, ".group", "flex-wrap"), "nowrap");
    assert.equal(value(NARROW, ".group", "overflow-x"), "auto");
    assert.equal(value(NARROW, ".button", "flex"), "none");
    assert.equal(value(NARROW, ".button", "white-space"), "nowrap");
  });

  test("drops the list below the box on the raised surface with the menu shadow", () => {
    assert.equal(value(NARROW, ".listbox", "position"), "absolute");
    assert.equal(value(NARROW, ".listbox", "background-color"), "var(--dg-surface-raised)");
    assert.equal(value(NARROW, ".listbox", "box-shadow"), "var(--dg-shadow-menu)");
    assert.equal(value(NARROW, ".listbox[hidden]", "display"), "none");
  });
});

describe("ReleaseFilter's looks", () => {
  test("ticks the selected option amber on the accent wash", () => {
    assert.equal(value(NARROW, ".option[aria-selected=\"true\"]", "background-color"), "var(--dg-accent-wash)");
    assert.equal(value(NARROW, ".option[aria-selected=\"true\"]", "color"), "var(--dg-accent)");
  });

  test("fills the selected desktop button amber, its count included", () => {
    assert.equal(value(NARROW, ".button[aria-pressed=\"true\"]", "background-color"), "var(--dg-accent)");
    assert.equal(value(NARROW, ".button[aria-pressed=\"true\"]", "color"), "var(--dg-on-accent)");
    assert.equal(value(NARROW, ".button[aria-pressed=\"true\"] .count", "color"), "var(--dg-on-accent)");
  });

  test("turns the trigger's border amber while open", () => {
    assert.equal(value(NARROW, ".trigger[aria-expanded=\"true\"]", "border-color"), "var(--dg-accent)");
  });

  test("rings the active option while the list has keyboard focus", () => {
    assert.equal(value(NARROW, ".listbox:focus-visible .active", "outline"), "2px solid var(--dg-focus)");
    assert.equal(value(NARROW, ".trigger:focus-visible", "outline"), "2px solid var(--dg-focus)");
    assert.equal(value(NARROW, ".button:focus-visible", "outline"), "2px solid var(--dg-focus)");
  });

  test("hovers only for a real pointer, turning a filter button's border amber", () => {
    assert.doesNotMatch(NARROW + WIDE, /:hover/);
    assert.equal(value(HOVER, ".trigger:hover", "border-color"), "var(--dg-accent)");
    assert.equal(value(HOVER, ".button:hover", "border-color"), "var(--dg-accent)");
    assert.doesNotMatch(css, /transition|animation/);
  });

  const tokens = parseTokens(read("tokens.css"), 360);
  for (const [fg, bg] of [
    ["--dg-fg", "--dg-surface-glass"],
    ["--dg-fg-muted", "--dg-surface-glass"],
    ["--dg-fg-subtle", "--dg-surface-raised"],
    ["--dg-on-accent", "--dg-accent"],
  ] as const) {
    test(`passes 4.5:1 for ${fg} on ${bg}`, () => {
      assert.ok(tokenContrast(tokens, fg, bg) >= 4.5, `${tokenContrast(tokens, fg, bg)}`);
    });
  }

  test("passes 4.5:1 for the selected option's amber on its wash, over the raised list", () => {
    assert.ok(tokenContrast(tokens, "--dg-accent", "--dg-accent-wash", "--dg-surface-raised") >= 4.5);
  });

  test("passes 3:1 for the trigger's and buttons' outline on the glass", () => {
    assert.ok(tokenContrast(tokens, "--dg-outline", "--dg-surface-glass") >= 3);
  });
});
