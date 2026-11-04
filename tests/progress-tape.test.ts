import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";
import { parseTokens, tokenContrast } from "../src/design-system/contrast.ts";
import { tapeProgress } from "../src/design-system/components/ProgressTape/progress.ts";

const read = (path: string) =>
  readFileSync(new URL(`../src/design-system/${path}`, import.meta.url), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
const css = read("components/ProgressTape/ProgressTape.module.css");
const tsx = read("components/ProgressTape/ProgressTape.tsx").replace(/\/\/.*$/gm, "");
const tokens = parseTokens(read("tokens.css"), 360);

// The CSS outside any @media block, and inside the reduced-motion one.
const REDUCED = /@media\s*\(\s*prefers-reduced-motion:\s*reduce\s*\)\s*\{((?:[^{}]*\{[^{}]*\})*)[^{}]*\}/g;
const reduced = [...css.matchAll(REDUCED)].map(([, body]) => body).join("\n");
const base = css.replace(REDUCED, "");

function rules(source: string) {
  return [...source.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, selectors, body]) => ({
    selectors: selectors.split(",").map((selector) => selector.trim()),
    body,
  }));
}

// Every value `property` takes in rules that list `selector`.
function values(source: string, selector: string, property: string): string[] {
  return rules(source)
    .filter((rule) => rule.selectors.includes(selector))
    .flatMap(({ body }) =>
      [...body.matchAll(/([\w-]+)\s*:\s*([^;]+)/g)]
        .filter(([, name]) => name === property)
        .map(([, , value]) => value.trim().replace(/\s+/g, " ")),
    );
}

function value(selector: string, property: string): string {
  const found = values(base, selector, property);
  assert.equal(found.length, 1, `${selector} sets ${property} ${found.length} times`);
  return found[0];
}

function token(selector: string, property: string): string {
  const match = /^var\((--dg-[\w-]+)\)$/.exec(value(selector, property));
  assert.ok(match, `${selector}'s ${property} isn't a single token`);
  return match[1];
}

// Every property the base CSS sets, on any rule.
const PROPERTIES = rules(base).flatMap(({ body }) => [...body.matchAll(/([\w-]+)\s*:/g)].map(([, name]) => name));

describe("tapeProgress", () => {
  test("passes a share of the snippet through unchanged", () => {
    assert.equal(tapeProgress(0), 0);
    assert.equal(tapeProgress(0.4), 0.4);
    assert.equal(tapeProgress(1), 1);
  });

  // currentTime can overshoot the duration by a frame, and a seek can land
  // anywhere. Held to the ends, the fill never leaves its track.
  test("holds anything past the ends to them", () => {
    assert.equal(tapeProgress(-0.2), 0);
    assert.equal(tapeProgress(1.003), 1);
    assert.equal(tapeProgress(Number.POSITIVE_INFINITY), 1);
    assert.equal(tapeProgress(Number.NEGATIVE_INFINITY), 0);
  });

  // Before the audio knows its length, elapsed / duration is NaN. As a
  // custom property that would make scaleX() invalid, the transform would
  // drop, and the fill would show the whole track.
  test("reads blank tape for a ratio the audio can't give yet", () => {
    assert.equal(tapeProgress(Number.NaN), 0);
  });
});

describe("ProgressTape.tsx", () => {
  test("is hidden from assistive tech, since the readout carries the time", () => {
    const root = /return\s*\(\s*(<div\b[^>]*>)/.exec(tsx);
    assert.ok(root, "the tape doesn't render a <div> first");
    assert.match(root[1], /\baria-hidden\b/);
  });

  test("isn't a progressbar or a live region", () => {
    assert.doesNotMatch(tsx, /\brole=|aria-value|aria-live|<progress\b|<meter\b/);
  });

  // SPEC.md › Code style allows inline style only to set a custom property.
  test("sets --progress inline, held by tapeProgress, and nothing else", () => {
    const styles = [...tsx.matchAll(/style=\{\{([^}]*)\}/g)].map(([, body]) => body.trim());
    assert.equal(styles.length, 1);
    assert.match(styles[0], /^"--progress":\s*tapeProgress\(ratio\)$/);
  });

  test("draws a track and one fill", () => {
    assert.equal([...tsx.matchAll(/<div\b/g)].length, 2);
  });
});

describe("ProgressTape.module.css", () => {
  test("is a 3 px --dg-line track, as both bar boards draw it", () => {
    assert.equal(value(".tape", "height"), "3px");
    assert.equal(token(".tape", "background-color"), "--dg-line");
  });

  test("fills in amber with the progress fill's glow", () => {
    assert.equal(token(".fill", "background-color"), "--dg-accent");
    assert.equal(token(".fill", "box-shadow"), "--dg-glow-accent-box");
  });

  test("fills the track's height", () => {
    assert.equal(value(".fill", "height"), "100%");
  });

  // The fill keeps the track's width and is scaled from its left edge, so
  // scaleX(0) leaves nothing and scaleX(1) covers the track exactly.
  test("scales the fill by --progress from the left edge, so 0 and 1 sit flush", () => {
    assert.match(value(".fill", "transform"), /^scaleX\(var\(--progress(?:, ?0)?\)\)$/);
    assert.match(value(".fill", "transform-origin"), /^left(?: center)?$/);
    for (const property of ["width", "min-width", "max-width", "margin", "margin-left", "margin-right", "left", "right", "inset", "position", "translate", "scale"]) {
      assert.ok(!PROPERTIES.includes(property), `the tape sets ${property}`);
    }
  });

  // timeupdate lands about every 250 ms, so the fill glides across each gap
  // at a steady rate. Only transform moves, so the tape never causes layout.
  test("glides between updates on transform alone, at a steady rate", () => {
    assert.equal(value(".fill", "transition"), "transform var(--dg-dur-2) linear");
    assert.doesNotMatch(css, /animation|@keyframes/);
  });

  test("jumps to each new value under reduced motion", () => {
    assert.deepEqual(values(reduced, ".fill", "transition"), ["none"]);
  });

  test("stands out from its track", () => {
    const ratio = tokenContrast(tokens, token(".fill", "background-color"), token(".tape", "background-color"));
    assert.ok(ratio >= 3, `the fill on its track is ${ratio.toFixed(2)}:1`);
  });
});
