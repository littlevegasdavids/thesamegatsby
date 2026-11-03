import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";
import { parseTokens, tokenContrast } from "../src/design-system/contrast.ts";
import {
  READOUT_GLYPH_PATHS,
  READOUT_GLYPH_SIZE,
  READOUT_MODES,
  readoutText,
  type ReadoutMode,
} from "../src/design-system/components/VhsReadout/modes.ts";

const read = (path: string) =>
  readFileSync(new URL(`../src/design-system/${path}`, import.meta.url), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
const css = read("components/VhsReadout/VhsReadout.module.css");
const tsx = read("components/VhsReadout/VhsReadout.tsx");
const phone = parseTokens(read("tokens.css"), 360);
const desktop = parseTokens(read("tokens.css"), 1280);

const MODES = Object.keys(READOUT_MODES) as ReadoutMode[];

// Every innermost rule in the file, top level or inside an @media block.
const RULES = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, selectors, body]) => ({
  selectors: selectors.split(",").map((selector) => selector.trim()),
  body,
}));

// Every value `property` takes in rules that list `selector`.
function values(selector: string, property: string): string[] {
  return RULES.filter((rule) => rule.selectors.includes(selector)).flatMap(({ body }) =>
    [...body.matchAll(/([\w-]+)\s*:\s*([^;]+)/g)]
      .filter(([, name]) => name === property)
      .map(([, , value]) => value.trim().replace(/\s+/g, " ")),
  );
}

function value(selector: string, property: string): string {
  const found = values(selector, property);
  assert.equal(found.length, 1, `${selector} sets ${property} ${found.length} times`);
  return found[0];
}

function token(selector: string, property: string): string {
  const match = /^var\((--dg-[\w-]+)\)$/.exec(value(selector, property));
  assert.ok(match, `${selector}'s ${property} isn't a single token`);
  return match[1];
}

// tokens.css sets the type sizes in rem, on the browser's 16 px default.
function remToPx(size: string | undefined): number {
  const match = /^(\d+(?:\.\d+)?)rem$/.exec(size ?? "");
  assert.ok(match, `"${size}" isn't a rem size`);
  return Number(match[1]) * 16;
}

describe("readoutText", () => {
  test("reads PLAY with the elapsed and total time, as on the canvas", () => {
    assert.equal(readoutText("play", 12, 30), "PLAY 00:12 / 00:30");
  });

  test("reads END once the snippet has ended", () => {
    assert.equal(readoutText("ended", 30, 30), "END 00:30 / 00:30");
  });

  test("reads LOAD and STOP in the other two modes", () => {
    assert.equal(readoutText("load", 0, 30), "LOAD 00:00 / 00:30");
    assert.equal(readoutText("stop", 12, 30), "STOP 00:12 / 00:30");
  });

  test("never shows a second that hasn't played yet", () => {
    assert.equal(readoutText("play", 12.9, 30), "PLAY 00:12 / 00:30");
  });

  test("reads blank tape for a time the audio doesn't know yet", () => {
    assert.equal(readoutText("load", 0, Number.NaN), "LOAD 00:00 / --:--");
  });

  // VT323 is subset to Latin-1 and has none of ▶ ■ ◌. Keeping the text to
  // characters it draws means the line never switches typeface midway.
  test("holds only characters VT323 draws, so the glyphs never reach the text", () => {
    for (const mode of MODES) {
      const text = readoutText(mode, 12, 30);
      assert.match(text, /^[\x20-\x7e]+$/, `${mode} reads "${text}"`);
    }
  });

  test("is uppercase, so the accessible name is what shows", () => {
    for (const mode of MODES) {
      const text = readoutText(mode, 12, 30);
      assert.equal(text, text.toUpperCase());
    }
  });
});

describe("READOUT_MODES", () => {
  test("marks play ▶, stop and ended ■, and load ◌, the spec's three glyphs", () => {
    const glyphs = Object.fromEntries(MODES.map((mode) => [mode, READOUT_MODES[mode].glyph]));
    assert.deepEqual(glyphs, { load: "◌", play: "▶", stop: "■", ended: "■" });
  });

  test("draws each glyph as an SVG path", () => {
    for (const [glyph, d] of Object.entries(READOUT_GLYPH_PATHS)) {
      assert.match(d, /^M[\d\s.,hvlaczHVLACZM-]+z$/, `${glyph} isn't a closed path`);
    }
  });

  test("draws play and the square as the bar boards do", () => {
    assert.equal(READOUT_GLYPH_PATHS["▶"], "M5 3v18l16-9z");
    assert.equal(READOUT_GLYPH_PATHS["■"], "M4 4h16v16H4z");
  });

  test("sizes the glyph at 11 px, as both bar boards draw it, inside the line", () => {
    assert.equal(READOUT_GLYPH_SIZE, 11);
    assert.ok(READOUT_GLYPH_SIZE < 18, "the glyph is taller than the readout floor");
  });

  test("lights only play", () => {
    const lit = MODES.filter((mode) => READOUT_MODES[mode].lit);
    assert.deepEqual(lit, ["play"]);
  });
});

describe("VhsReadout.tsx", () => {
  test("hides the glyph from assistive tech", () => {
    const svgs = [...tsx.matchAll(/<svg\b[^>]*>/g)].map(([tag]) => tag);
    assert.equal(svgs.length, 1);
    assert.match(svgs[0], /\baria-hidden\b/);
  });

  // A live region would announce every second of the snippet.
  test("isn't a live region", () => {
    assert.doesNotMatch(tsx, /aria-live|aria-atomic|aria-relevant/);
    assert.doesNotMatch(tsx, /\brole=/);
    assert.doesNotMatch(tsx, /<output\b/);
  });

  test("renders readoutText, so the text tested above is the text shown", () => {
    assert.match(tsx, /\{readoutText\(mode, elapsed, duration\)\}/);
  });
});

describe("VhsReadout.module.css", () => {
  test("sets the readout in VT323", () => {
    assert.equal(token(".readout", "font-family"), "--dg-font-readout");
  });

  test("uses --dg-text-readout and no other size", () => {
    assert.equal(token(".readout", "font-size"), "--dg-text-readout");
    const sizes = RULES.flatMap(({ body }) => [...body.matchAll(/font-size\s*:/g)]);
    assert.equal(sizes.length, 1);
  });

  test("is never below the 18 px readout floor, on a phone or desktop", () => {
    for (const [width, tokens] of [[360, phone], [1280, desktop]] as const) {
      const size = remToPx(tokens.get("--dg-text-readout"));
      const floor = remToPx(tokens.get("--dg-text-readout-s"));
      assert.equal(floor, 18, "the floor token has moved");
      assert.ok(size >= floor, `${size} px at ${width} px`);
    }
  });

  test("keeps the line whole, so the time never wraps", () => {
    assert.equal(value(".readout", "white-space"), "nowrap");
  });

  test("glows amber when lit, and is muted without a glow otherwise", () => {
    assert.equal(token(".lit", "color"), "--dg-accent");
    assert.equal(token(".lit", "text-shadow"), "--dg-glow-accent");
    assert.equal(token(".readout", "color"), "--dg-fg-muted");
    assert.deepEqual(values(".readout", "text-shadow"), []);
  });

  test("doesn't move, so there's nothing to stop under reduced motion", () => {
    assert.doesNotMatch(css, /animation|transition/);
  });

  // The readout sits on the now-playing bar, and on the page on /system.
  test("reaches 4.5:1 lit and muted, on the bar and the page", () => {
    for (const colour of [token(".lit", "color"), token(".readout", "color")]) {
      for (const surface of ["--dg-surface-raised", "--dg-bg"]) {
        const ratio = tokenContrast(phone, colour, surface);
        assert.ok(ratio >= 4.5, `${colour} on ${surface} is ${ratio.toFixed(2)}:1`);
      }
    }
  });
});
