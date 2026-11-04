import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";
import { parseTokens, tokenContrast } from "../src/design-system/contrast.ts";
import { releaseRowView } from "../src/design-system/components/ReleaseRow/view.ts";
import type { Release, Track } from "../src/design-system/types.ts";

const read = (path: string) =>
  readFileSync(new URL(`../src/design-system/${path}`, import.meta.url), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
const css = read("components/ReleaseRow/ReleaseRow.module.css");
const tsx = read("components/ReleaseRow/ReleaseRow.tsx").replace(/\/\/.*$/gm, "");

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

const track = (id: string, kind: Track["kind"] = "original"): Track => ({ id, title: id.toUpperCase(), kind, duration: 30 });
const single = (kind: Track["kind"] = "original"): Release => ({
  id: "s",
  type: "single",
  title: "Give me that KaiZen",
  cover: "/c.jpg",
  tracks: [track("s", kind)],
  leadTrackId: "s",
  links: [],
});
const ep: Release = {
  id: "ep",
  type: "ep",
  title: "Can't You See",
  cover: "/c.jpg",
  tracks: [track("a"), track("b", "remix")],
  leadTrackId: "a",
  links: [],
};
const album: Release = { ...ep, id: "al", type: "album", title: "[Album title]", tracks: Array.from({ length: 8 }, (_, i) => track(`t${i}`)) };

describe("ReleaseRow's view of a single", () => {
  test("is idle and reads SINGLE until its track is the one playing", () => {
    const view = releaseRowView(single(), { playingTrackId: "other", playState: "playing", elapsed: 9 });
    assert.equal(view.kind, "single");
    if (view.kind !== "single") return;
    assert.deepEqual([view.meta, view.lit, view.running, view.label], ["SINGLE", false, false, "Play Give me that KaiZen snippet"]);
  });

  test("reads PLAYING with the count, lit and pressed, while it plays", () => {
    const view = releaseRowView(single(), { playingTrackId: "s", playState: "playing", elapsed: 9.7 });
    assert.equal(view.kind === "single" && view.meta, "PLAYING 00:09");
    assert.ok(view.kind === "single" && view.lit && view.running && view.playing);
    assert.equal(view.label, "Stop Give me that KaiZen snippet");
  });

  test("reads PLAYED once played, still lit but no longer pressed", () => {
    const view = releaseRowView(single(), { playingTrackId: "s", playState: "played", elapsed: 30 });
    assert.ok(view.kind === "single" && view.lit && !view.running && !view.playing);
    assert.equal(view.kind === "single" && view.meta, "PLAYED");
    assert.equal(view.label, "Play Give me that KaiZen snippet");
  });

  test("reads LOADING, lit and pressed, while it loads", () => {
    const view = releaseRowView(single(), { playingTrackId: "s", playState: "loading", elapsed: 0 });
    assert.ok(view.kind === "single" && view.lit && view.running && !view.playing);
    assert.equal(view.kind === "single" && view.meta, "LOADING");
  });

  test("shows the snippet's length as 0:30", () => {
    const view = releaseRowView(single(), {});
    assert.equal(view.kind === "single" && view.length, "0:30");
  });

  test("tags a remix or edit single, and no other", () => {
    assert.equal(releaseRowView(single("remix"), {}).tag, "REMIX");
    assert.equal(releaseRowView(single("edit"), {}).tag, "EDIT");
    assert.equal(releaseRowView(single(), {}).tag, null);
    assert.equal(releaseRowView(ep, {}).tag, null);
  });
});

describe("ReleaseRow's view of an EP or album", () => {
  test("labels the row Show or Hide its tracks, with the type and count as meta", () => {
    const closed = releaseRowView(ep, { expanded: false });
    const open = releaseRowView(album, { expanded: true });
    assert.equal(closed.kind, "group");
    assert.deepEqual([closed.label, closed.kind === "group" && closed.meta], ["Show Can't You See tracks", "EP · 2 TRACKS"]);
    assert.deepEqual([open.label, open.kind === "group" && open.meta], ["Hide [Album title] tracks", "ALBUM · 8 TRACKS"]);
    assert.equal(open.kind === "group" && open.toggleText, "Hide tracks");
    assert.equal(closed.kind === "group" && closed.toggleText, "Show tracks");
  });

  test("gives the playing track its state and every other track idle", () => {
    const view = releaseRowView(ep, { expanded: true, playingTrackId: "b", playState: "playing", elapsed: 12 });
    assert.deepEqual(view.kind === "group" && view.trackStates, ["idle", "playing"]);
    const none = releaseRowView(ep, { expanded: true, playingTrackId: "zz", playState: "playing" });
    assert.deepEqual(none.kind === "group" && none.trackStates, ["idle", "idle"]);
  });
});

describe("ReleaseRow's markup", () => {
  test("holds no state of its own", () => {
    assert.doesNotMatch(tsx, /"use client"|useState|useEffect/);
  });

  test("makes a single one pressed button, and an EP or album one expanded button", () => {
    const buttons = [...tsx.matchAll(/<button\b[^>]*>/gs)].map(([b]) => b);
    assert.equal(buttons.length, 2);
    assert.ok(buttons.some((b) => /aria-pressed=\{view\.running\}/.test(b)));
    assert.ok(buttons.some((b) => /aria-expanded=\{expanded\}/.test(b) && /aria-controls=\{tracksId\}/.test(b)));
    for (const b of buttons) {
      assert.match(b, /type="button"/);
      assert.match(b, /aria-label=\{view\.label\}/);
    }
  });

  test("puts no link inside the row", () => {
    assert.doesNotMatch(tsx, /<a\b/);
  });

  test("gives the cover fixed dimensions and no alt text", () => {
    assert.match(tsx, /<Image\b[^>]*width=\{60\}[^>]*height=\{60\}/s);
    assert.match(tsx, /<Image\b[^>]*alt=""/s);
  });

  test("renders the nested tracks as TrackRows, hidden while collapsed", () => {
    assert.match(tsx, /<TrackRow\b[^>]*variant="nested"/s);
    assert.match(tsx, /<div id=\{tracksId\} hidden=\{!expanded\}/);
  });

  test("marks a lit single with the sparkle, and hides every glyph", () => {
    assert.match(tsx, /view\.lit && <SparkleStar size=\{12\} \/>/);
    for (const svg of tsx.match(/<svg\b[^>]*>/g) ?? []) assert.match(svg, /aria-hidden/);
  });
});

describe("ReleaseRow's layout", () => {
  test("is --dg-release-h tall (the boards' 72 and 80 px), border-box, with a hairline under it", () => {
    assert.equal(value(NARROW, ".row", "height"), "var(--dg-release-h)");
    assert.equal(value(WIDE, ".row", "height"), undefined);
    assert.equal(value(NARROW, ".row", "box-sizing"), "border-box");
    assert.equal(value(NARROW, ".row", "border-bottom"), "1px solid var(--dg-line)");
  });

  test("uses TrackRow's padding and gap, so the nested titles line up with the release title", () => {
    assert.equal(value(NARROW, ".row", "padding"), "0 var(--dg-space-3)");
    assert.equal(value(NARROW, ".row", "gap"), "var(--dg-space-3)");
    assert.equal(value(WIDE, ".row", "padding"), "0 var(--dg-space-4)");
    assert.equal(value(WIDE, ".row", "gap"), "var(--dg-space-4)");
    assert.equal(px(value(NARROW, ".cover", "width")), 56);
    assert.equal(px(value(NARROW, ".cover", "height")), 56);
    assert.equal(px(value(WIDE, ".cover", "width")), 60);
    assert.equal(px(value(WIDE, ".cover", "height")), 60);
  });

  test("truncates a long title with an ellipsis", () => {
    assert.equal(value(NARROW, ".text", "min-width"), "0");
    assert.equal(value(NARROW, ".title", "white-space"), "nowrap");
    assert.equal(value(NARROW, ".title", "overflow"), "hidden");
    assert.equal(value(NARROW, ".title", "text-overflow"), "ellipsis");
  });

  test("sticks an expanded row under the filter, on the opaque surface", () => {
    assert.equal(value(NARROW, ".expanded", "position"), "sticky");
    assert.equal(value(NARROW, ".expanded", "top"), "var(--dg-sticky-release)");
    assert.equal(value(NARROW, ".expanded", "background-color"), "var(--dg-surface)");
    assert.doesNotMatch(css.replace(/\.expanded\s*\{[^}]*\}/, ""), /position:\s*sticky/);
  });

  test("clips only the title, so nothing stops the row sticking", () => {
    const clipping = rules(css).filter(({ body }) => /(^|[^-])overflow:/.test(body)).flatMap(({ selectors }) => selectors);
    assert.deepEqual(clipping, [".title"]);
  });

  test("keeps the rings and type in their tokens", () => {
    assert.equal(px(value(NARROW, ".ring", "width")), 40);
    assert.equal(px(value(NARROW, ".ring", "height")), 40);
    assert.equal(value(NARROW, ".title", "font-size"), "var(--dg-text-title)");
    assert.equal(value(NARROW, ".meta", "font-size"), "var(--dg-text-readout-s)");
    assert.equal(value(NARROW, ".length", "font-size"), "var(--dg-text-readout)");
    assert.equal(value(NARROW, ".tag", "font-size"), "var(--dg-text-label)");
  });

  test("shows Show tracks / Hide tracks from 768 px only", () => {
    assert.equal(value(NARROW, ".toggleText", "display"), "none");
    assert.equal(value(WIDE, ".toggleText", "display"), "inline");
  });
});

describe("ReleaseRow's looks", () => {
  test("lights a single on the raised surface, with an amber title and cover outline", () => {
    assert.equal(value(NARROW, ".lit", "background-color"), "var(--dg-surface-raised)");
    assert.equal(value(NARROW, ".lit", "border-radius"), "var(--dg-radius-m)");
    assert.equal(value(NARROW, ".lit .title", "color"), "var(--dg-accent)");
    assert.equal(value(NARROW, ".lit .cover", "outline"), "1px solid var(--dg-accent)");
  });

  test("glows the meta amber only while playing, and mutes it otherwise once lit", () => {
    assert.equal(value(NARROW, ".meta", "color"), "var(--dg-fg-subtle)");
    assert.equal(value(NARROW, ".lit .meta", "color"), "var(--dg-fg-muted)");
    assert.equal(value(NARROW, ".playing .meta", "color"), "var(--dg-accent)");
  });

  test("fills the ring amber with the stop square while running", () => {
    assert.equal(value(NARROW, ".running .ring", "background-color"), "var(--dg-accent)");
    assert.equal(value(NARROW, ".running .ring", "color"), "var(--dg-on-accent)");
  });

  test("outlines remix and edit tags in hazard", () => {
    assert.equal(value(NARROW, ".tag", "border"), "1px solid var(--dg-rec)");
    assert.equal(value(NARROW, ".tag", "color"), "var(--dg-rec)");
  });

  test("rings focus 2 px out, and hovers only for a real pointer", () => {
    assert.equal(value(NARROW, ".row:focus-visible", "outline"), "2px solid var(--dg-focus)");
    assert.equal(value(NARROW, ".row:focus-visible", "outline-offset"), "2px");
    assert.doesNotMatch(NARROW + WIDE, /:hover/);
    assert.equal(value(HOVER, ".row:not(.lit):hover", "background-color"), "var(--dg-surface)");
    assert.doesNotMatch(css, /transition|animation/);
  });

  const tokens = parseTokens(read("tokens.css"), 360);
  for (const [fg, bg] of [
    ["--dg-rec", "--dg-bg"],
    ["--dg-rec", "--dg-surface"],
    ["--dg-rec", "--dg-surface-raised"],
    ["--dg-fg-subtle", "--dg-surface"],
    ["--dg-fg-muted", "--dg-surface-raised"],
    ["--dg-accent", "--dg-surface-raised"],
  ] as const) {
    test(`passes 4.5:1 for ${fg} on ${bg}`, () => {
      assert.ok(tokenContrast(tokens, fg, bg) >= 4.5, `${tokenContrast(tokens, fg, bg)}`);
    });
  }
});
