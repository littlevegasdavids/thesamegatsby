import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";
import { parseTokens, tokenContrast } from "../src/design-system/contrast.ts";
import {
  TRACK_ROW_STATES,
  trackNumber,
  trackRowLabel,
  trackRowLook,
  trackRowTime,
} from "../src/design-system/components/TrackRow/states.ts";

const read = (path: string) =>
  readFileSync(new URL(`../src/design-system/${path}`, import.meta.url), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
const css = read("components/TrackRow/TrackRow.module.css");
const tsx = read("components/TrackRow/TrackRow.tsx").replace(/\/\/.*$/gm, "");

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

describe("TrackRow's states", () => {
  test("lists the four states the spec names", () => {
    assert.deepEqual([...TRACK_ROW_STATES], ["idle", "loading", "playing", "played"]);
  });

  test("labels the row Play or Stop, with the title", () => {
    assert.equal(trackRowLabel("UKG 333", "idle"), "Play UKG 333 snippet");
    assert.equal(trackRowLabel("UKG 333", "loading"), "Stop UKG 333 snippet");
    assert.equal(trackRowLabel("UKG 333", "playing"), "Stop UKG 333 snippet");
    assert.equal(trackRowLabel("UKG 333", "played"), "Play UKG 333 snippet");
  });

  test("is pressed while loading or playing, and lit in every state but idle", () => {
    assert.deepEqual(trackRowLook("idle"), { lit: false, running: false });
    assert.deepEqual(trackRowLook("loading"), { lit: true, running: true });
    assert.deepEqual(trackRowLook("playing"), { lit: true, running: true });
    assert.deepEqual(trackRowLook("played"), { lit: true, running: false });
  });

  test("shows the length idle, the elapsed time playing, END once played, and the load glyph loading", () => {
    assert.equal(trackRowTime("idle", 0, 30), "0:30");
    assert.equal(trackRowTime("playing", 12.4, 30), "00:12");
    assert.equal(trackRowTime("played", 30, 30), "END");
    assert.equal(trackRowTime("loading", 0, 30), null);
  });

  test("zero-pads the number", () => {
    assert.equal(trackNumber(1), "01");
    assert.equal(trackNumber(12), "12");
  });
});

describe("TrackRow's markup", () => {
  test("is one button, with no link inside it", () => {
    assert.equal([...tsx.matchAll(/<button\b/g)].length, 1);
    assert.doesNotMatch(tsx, /<a\b/);
    const button = /<button\b[^>]*>/s.exec(tsx)?.[0] ?? "";
    assert.match(button, /type="button"/);
    assert.match(button, /aria-pressed=\{running\}/);
    assert.match(button, /aria-label=\{trackRowLabel\(title, state\)\}/);
    assert.match(button, /onClick=\{onToggle\}/);
  });

  test("holds no state of its own", () => {
    assert.doesNotMatch(tsx, /"use client"|useState|useEffect/);
  });

  test("swaps the number for the sparkle when lit, and the play glyph for stop while running", () => {
    assert.match(tsx, /lit \? <SparkleStar size=\{14\} \/> : trackNumber\(index\)/);
    assert.match(tsx, /GLYPHS\[running \? "stop" : "play"\]/);
  });

  test("hides every glyph from assistive tech, and is no live region", () => {
    for (const svg of tsx.match(/<svg\b[^>]*>/g) ?? []) assert.match(svg, /aria-hidden/);
    assert.doesNotMatch(tsx, /aria-live|role="status"|role="timer"/);
  });

  test("shows LEAD in capitals only when lead is set", () => {
    assert.match(tsx, /\{lead && <span className=\{styles\.lead\}>LEAD<\/span>\}/);
  });
});

describe("TrackRow's layout", () => {
  test("is a full-width row, border-box, with a hairline under it", () => {
    assert.equal(value(NARROW, ".row", "box-sizing"), "border-box");
    assert.equal(value(NARROW, ".row", "width"), "100%");
    assert.equal(value(NARROW, ".row", "border-bottom"), "1px solid var(--dg-line)");
  });

  test("is 44 px or taller in both variants at both widths, at the boards' heights", () => {
    assert.equal(px(value(NARROW, ".nested", "height")), 56);
    assert.equal(px(value(NARROW, ".list", "height")), 52);
    assert.equal(px(value(WIDE, ".nested", "height")), 60);
    assert.equal(px(value(WIDE, ".list", "height")), 56);
  });

  test("indents a nested row to the release title's edge: padding, cover and gap", () => {
    assert.equal(
      value(NARROW, ".nested", "padding"),
      "0 var(--dg-space-3) 0 calc(var(--dg-space-3) + 56px + var(--dg-space-3))",
    );
    assert.equal(
      value(WIDE, ".nested", "padding"),
      "0 var(--dg-space-4) 0 calc(var(--dg-space-4) + 60px + var(--dg-space-4))",
    );
  });

  test("puts a nested row on the translucent surface, and a list row on nothing", () => {
    assert.equal(value(NARROW, ".nested", "background-color"), "var(--dg-surface-translucent)");
    assert.equal(value(NARROW, ".row", "background-color"), "transparent");
    assert.equal(value(NARROW, ".lit", "background-color"), "var(--dg-surface-raised)");
  });

  test("fixes the number, time and ring columns, so a state change moves nothing", () => {
    assert.equal(value(NARROW, ".index", "flex"), "none");
    assert.equal(px(value(NARROW, ".index", "width")), 24);
    assert.equal(px(value(WIDE, ".index", "width")), 28);
    assert.equal(value(NARROW, ".time", "flex"), "none");
    assert.equal(value(NARROW, ".time", "width"), "5ch");
    assert.equal(value(NARROW, ".ring", "flex"), "none");
    assert.equal(px(value(NARROW, ".ring", "width")), 36);
    assert.equal(px(value(NARROW, ".ring", "height")), 36);
  });

  test("truncates a long title with an ellipsis, so it never pushes the time or the ring", () => {
    assert.equal(value(NARROW, ".title", "min-width"), "0");
    assert.equal(value(NARROW, ".title", "flex"), "1 1 auto");
    assert.equal(value(NARROW, ".titleText", "white-space"), "nowrap");
    assert.equal(value(NARROW, ".titleText", "overflow"), "hidden");
    assert.equal(value(NARROW, ".titleText", "text-overflow"), "ellipsis");
    assert.equal(value(NARROW, ".lead", "flex"), "none");
  });

  test("sets the title, the number and the time in their tokens", () => {
    assert.equal(value(NARROW, ".title", "font-size"), "var(--dg-text-title-s)");
    assert.equal(value(NARROW, ".index", "font-family"), "var(--dg-font-readout)");
    assert.equal(value(NARROW, ".index", "font-size"), "var(--dg-text-readout)");
    assert.equal(value(NARROW, ".time", "font-family"), "var(--dg-font-readout)");
    assert.equal(value(NARROW, ".time", "font-size"), "var(--dg-text-readout)");
    assert.equal(value(NARROW, ".lead", "font-size"), "var(--dg-text-label)");
  });
});

describe("TrackRow's looks", () => {
  test("lights the title and the time amber, and fills the ring while running", () => {
    assert.equal(value(NARROW, ".lit .title", "color"), "var(--dg-accent)");
    assert.equal(value(NARROW, ".lit .time", "color"), "var(--dg-accent)");
    assert.equal(value(NARROW, ".running .ring", "background-color"), "var(--dg-accent)");
    assert.equal(value(NARROW, ".running .ring", "border-color"), "var(--dg-accent)");
    assert.equal(value(NARROW, ".running .ring", "color"), "var(--dg-on-accent)");
  });

  test("keeps the load glyph muted, the lamp off until the tape runs", () => {
    assert.equal(value(NARROW, ".loadGlyph", "color"), "var(--dg-fg-muted)");
  });

  test("rings keyboard focus in --dg-focus, 2 px out", () => {
    assert.equal(value(NARROW, ".row:focus-visible", "outline"), "2px solid var(--dg-focus)");
    assert.equal(value(NARROW, ".row:focus-visible", "outline-offset"), "2px");
  });

  test("hovers only where there's a real pointer, as the desktop boards draw it", () => {
    assert.doesNotMatch(NARROW + WIDE, /:hover/);
    assert.equal(value(HOVER, ".list:not(.lit):hover", "background-color"), "var(--dg-surface)");
    assert.equal(value(HOVER, ".nested:hover", "background-color"), "var(--dg-surface-raised)");
  });

  test("snaps between states, with no transition or animation", () => {
    assert.doesNotMatch(css, /transition|animation/);
  });

  const tokens = parseTokens(read("tokens.css"), 360);
  const pairs: [string, string][] = [
    ["--dg-fg", "--dg-surface-translucent"],
    ["--dg-fg-subtle", "--dg-surface-translucent"],
    ["--dg-fg-subtle", "--dg-bg"],
    ["--dg-fg-subtle", "--dg-surface"],
    ["--dg-accent", "--dg-surface-raised"],
    ["--dg-fg-muted", "--dg-surface-raised"],
    ["--dg-on-accent", "--dg-accent"],
  ];
  for (const [fg, bg] of pairs) {
    test(`passes 4.5:1 for ${fg} on ${bg}`, () => {
      assert.ok(tokenContrast(tokens, fg, bg) >= 4.5, `${tokenContrast(tokens, fg, bg)}`);
    });
  }

  test("passes 3:1 for the ring's outline on every surface it sits on", () => {
    for (const bg of ["--dg-bg", "--dg-surface", "--dg-surface-translucent", "--dg-surface-raised"]) {
      assert.ok(tokenContrast(tokens, "--dg-outline", bg) >= 3, bg);
    }
  });
});
