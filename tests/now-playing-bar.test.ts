import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";
import { parseTokens, tokenContrast } from "../src/design-system/contrast.ts";
import { NOW_PLAYING_STATES, nowPlayingView } from "../src/design-system/components/NowPlayingBar/view.ts";

const read = (path: string) =>
  readFileSync(new URL(`../src/${path}`, import.meta.url), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
const css = read("design-system/components/NowPlayingBar/NowPlayingBar.module.css");
const tsx = read("design-system/components/NowPlayingBar/NowPlayingBar.tsx").replace(/^\s*\/\/.*$/gm, "");
const frameCss = read("app/system/SystemFrame.module.css");
const tokensCss = read("design-system/tokens.css");
const tokens = parseTokens(tokensCss, 360);

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
    .map(([, , v]) => v.trim());
  assert.ok(found.length <= 1, `${selector} sets ${property} ${found.length} times`);
  return found[0];
}

describe("NowPlayingBar's view", () => {
  test("has the spec's three states", () => {
    assert.deepEqual(NOW_PLAYING_STATES, ["loading", "playing", "ended"]);
  });

  test("reads the tape and readout from the state", () => {
    assert.deepEqual(
      NOW_PLAYING_STATES.map((s) => [nowPlayingView(s, "KaiZen", 12, 30).mode, nowPlayingView(s, "KaiZen", 12, 30).ratio]),
      [
        ["load", 0],
        ["play", 0.4],
        ["ended", 1],
      ],
    );
  });

  test("holds the tape at 0 before the audio knows its length", () => {
    assert.equal(nowPlayingView("playing", "KaiZen", 3, Number.NaN).ratio, 0);
    assert.equal(nowPlayingView("playing", "KaiZen", 3, 0).ratio, 0);
  });

  test("offers Stop while loading or playing, and Replay with Close once ended (G5)", () => {
    for (const s of ["loading", "playing"] as const) {
      const view = nowPlayingView(s, "KaiZen", 12, 30);
      assert.deepEqual([view.control, view.close], [{ icon: "stop", label: "Stop snippet" }, false], s);
    }
    const ended = nowPlayingView("ended", "KaiZen", 30, 30);
    assert.deepEqual([ended.control, ended.close], [{ icon: "replay", label: "Replay snippet" }, true]);
  });

  test("heads the stream links Stream full track, and Hear the full track, emphasised, once ended", () => {
    assert.deepEqual(
      NOW_PLAYING_STATES.map((s) => [nowPlayingView(s, "KaiZen", 0, 30).heading, nowPlayingView(s, "KaiZen", 0, 30).emphasis]),
      [
        ["Stream full track", false],
        ["Stream full track", false],
        ["Hear the full track", true],
      ],
    );
  });

  test("announces Playing {title} and Snippet ended, and never the time", () => {
    assert.equal(nowPlayingView("loading", "KaiZen", 0, 30).announce, "");
    assert.equal(nowPlayingView("playing", "KaiZen", 12, 30).announce, "Playing KaiZen");
    assert.equal(nowPlayingView("playing", "KaiZen", 13, 30).announce, "Playing KaiZen");
    assert.equal(nowPlayingView("ended", "KaiZen", 30, 30).announce, "Snippet ended");
  });
});

describe("NowPlayingBar's markup", () => {
  test("is a client component, since it measures itself", () => {
    assert.match(tsx, /^\s*"use client";/);
    assert.match(tsx, /new ResizeObserver/);
  });

  test("is a section named Now playing, with the tape, the scanlines and a polite live region", () => {
    assert.match(tsx, /<section[^>]*aria-label="Now playing"/);
    assert.match(tsx, /<ProgressTape ratio=\{view\.ratio\} \/>/);
    assert.match(tsx, /className=\{`\$\{styles\.scan\} dg-scanlines`\} aria-hidden/);
    assert.match(tsx, /aria-live="polite"[^>]*>\s*\{view\.announce\}/);
  });

  test("renders the readout, never as a live region itself", () => {
    assert.match(tsx, /<VhsReadout mode=\{view\.mode\} elapsed=\{elapsed\} duration=\{duration\} \/>/);
  });

  test("keeps one button for Stop and Replay, so focus stays on it when the snippet ends", () => {
    const controls = /<div className=\{styles\.controls\}>([\s\S]*?)<\/div>/.exec(tsx)?.[1] ?? "";
    const buttons = controls.match(/<Button\b/g) ?? [];
    assert.equal(buttons.length, 2);
    assert.match(controls, /^\s*<Button\s+variant="hardware"\s+icon=\{view\.control\.icon\}\s+label=\{view\.control\.label\}/);
    assert.match(controls, /\{view\.close && <Button variant="hardware" icon="close" label="Close player"/);
  });

  test("streams through StreamLinks' bar, emphasised once ended", () => {
    assert.match(tsx, /<StreamLinks\s+variant="bar"\s+heading=\{view\.heading\}\s+emphasis=\{view\.emphasis\}\s+links=\{streamLinks\}/);
  });

  test("gives the cover fixed dimensions and no alt text, above the scanlines", () => {
    assert.match(tsx, /<Image className=\{styles\.cover\} src=\{track\.cover\} alt="" width=\{56\} height=\{56\} \/>/);
    assert.ok(tsx.indexOf("dg-scanlines") < tsx.indexOf("styles.cover"), "the scanlines come first, so the content paints over them");
    assert.equal(value(NARROW, ".content", "position"), "relative");
  });

  test("reserves its height with an in-flow spacer that follows the bar's measured size", () => {
    assert.match(tsx, /<div className=\{styles\.spacer\} aria-hidden \/>/);
    assert.match(tsx, /setProperty\("--dg-bar-h", `\$\{[^}]+\}px`\)/);
    assert.match(tsx, /publish\(el\.getBoundingClientRect\(\)\.height\);\s*const observer/, "measured once at mount, before a parent scrolls");
    assert.match(tsx, /removeProperty\("--dg-bar-h"\)/);
    assert.equal(value(NARROW, ".spacer", "height"), "var(--dg-bar-h)");
  });
});

describe("NowPlayingBar's layout", () => {
  test("is fixed to the bottom on the bar layer, clear of the home indicator", () => {
    assert.equal(value(NARROW, ".bar", "position"), "fixed");
    assert.equal(value(NARROW, ".bar", "inset"), "auto 0 0");
    assert.equal(value(NARROW, ".bar", "z-index"), "var(--dg-z-bar)");
    assert.match(value(NARROW, ".content", "padding-bottom") ?? "", /env\(safe-area-inset-bottom, 0px\)/);
  });

  test("sits on the raised surface with a hairline over it and the bar's shadow", () => {
    assert.equal(value(NARROW, ".bar", "background-color"), "var(--dg-surface-raised)");
    assert.equal(value(NARROW, ".bar", "border-top"), "1px solid var(--dg-line)");
    assert.equal(value(NARROW, ".bar", "box-shadow"), "var(--dg-shadow-bar)");
  });

  test("lays the scanlines under the tape's edge and beneath the content", () => {
    assert.equal(value(NARROW, ".scan", "position"), "absolute");
    assert.equal(value(NARROW, ".scan", "inset"), "3px 0 0");
    assert.equal(value(NARROW, ".scan", "pointer-events"), "none");
    assert.ok(!rules(css).some((r) => r.selectors.includes(".cover") && /z-index|position/.test(r.body)), "the cover needs no lift");
  });

  test("is two rows below 768 px and one wrapping row from it", () => {
    assert.equal(value(NARROW, ".content", "flex-direction"), "column");
    assert.equal(value(WIDE, ".content", "flex-direction"), "row");
    assert.equal(value(WIDE, ".content", "flex-wrap"), "wrap");
    assert.equal(value(WIDE, ".track", "flex"), "1 1 320px");
  });

  test("draws the cover at 48 px on a phone and 56 from 768 px, square", () => {
    assert.equal(value(NARROW, ".cover", "width"), "48px");
    assert.equal(value(NARROW, ".cover", "height"), "48px");
    assert.equal(value(WIDE, ".cover", "width"), "56px");
    assert.equal(value(WIDE, ".cover", "height"), "56px");
  });

  test("keeps the title in Chakra Petch at the title-s size, truncating", () => {
    assert.equal(value(NARROW, ".title", "font-size"), "var(--dg-text-title-s)");
    assert.equal(value(NARROW, ".title", "text-overflow"), "ellipsis");
    assert.equal(value(NARROW, ".title", "white-space"), "nowrap");
    assert.ok(!/--dg-font-display/.test(css), "no Aero on the bar (G1)");
  });

  test("its title reads 4.5:1 on the bar", () => {
    assert.ok(tokenContrast(tokens, "--dg-fg", "--dg-surface-raised") >= 4.5);
  });
});

describe("the page around the bar", () => {
  test("--dg-bar-h starts at 0 in tokens.css", () => {
    assert.match(tokensCss, /--dg-bar-h:\s*0px;/);
  });

  test("SystemFrame's scroller pads its bottom by the bar, so forward Tab never hides focus behind it", () => {
    assert.equal(value(frameCss, ".scroller", "scroll-padding-bottom"), "var(--dg-bar-h)");
  });
});
