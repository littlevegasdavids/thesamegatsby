import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";
import { parseTokens, resolveColor } from "../src/design-system/contrast.ts";
import {
  PRIMITIVES,
  SEMANTIC,
  TYPE_SCALE,
  describeColour,
  describeSize,
  ratioOnBg,
} from "../src/app/system/sections/tokens.ts";

const css = readFileSync(new URL("../src/design-system/tokens.css", import.meta.url), "utf8");
const tokens = parseTokens(css, 360);

describe("/system tokens section", () => {
  test("has a swatch for every colour primitive in tokens.css", () => {
    const primitives = [...tokens].filter(([, value]) => value.startsWith("#")).map(([name]) => name);
    assert.deepEqual(PRIMITIVES.map((swatch) => swatch.token).sort(), primitives.sort());
  });

  // The grid's colours are shown with the backdrop they draw (DS-8).
  test("has a swatch for every semantic colour token", () => {
    const colours = [...tokens.keys()].filter((name) => {
      if (name.startsWith("--dg-grid-") || tokens.get(name)?.startsWith("#")) return false;
      try {
        resolveColor(tokens, name);
        return true;
      } catch {
        return false;
      }
    });
    assert.deepEqual([...SEMANTIC].sort(), colours.sort());
  });

  test("shows every --dg-text- token in the type scale", () => {
    const sizes = [...tokens.keys()].filter((name) => name.startsWith("--dg-text-"));
    assert.deepEqual([...new Set(TYPE_SCALE.map((sample) => sample.token))].sort(), sizes.sort());
  });

  // The style tile's captions, so a drift in tokens.css shows up here before
  // it shows up on the canvas check. Ultra light is 7.547:1; the tile and the
  // spec's contrast table round it to 7.6.
  test("gives the style tile's ratios on tape black", () => {
    const ratios = Object.fromEntries(PRIMITIVES.map((swatch) => [swatch.name, ratioOnBg(tokens, swatch.token)]));
    assert.equal(ratios["Bone"], "16.8:1");
    assert.equal(ratios["Bone muted"], "9.9:1");
    assert.equal(ratios["Bone subtle"], "5.4:1");
    assert.equal(ratios["Sodium"], "11.1:1");
    assert.equal(ratios["Signal"], "15.2:1");
    assert.equal(ratios["Hazard"], "6.0:1");
    assert.equal(ratios["Ultra light"], "7.5:1");
  });

  test("composites a translucent token over the ground before measuring", () => {
    assert.equal(ratioOnBg(tokens, "--dg-bg"), "1.0:1");
    assert.match(ratioOnBg(tokens, "--dg-surface-glass"), /^1\.\d:1$/);
  });
});

describe("describeSize", () => {
  const sizes = `
    :root {
      --dg-body: 1rem;
      --dg-wordmark: 1.75rem;
      --dg-hero: clamp(1.875rem, 5.4vw, 4.5rem);
      --dg-odd: larger;
    }
    @media (min-width: 768px) {
      :root { --dg-wordmark: 2.25rem; }
    }
  `;
  const phone = parseTokens(sizes, 360);
  const desktop = parseTokens(sizes, 768);

  test("gives one size when phone and desktop agree", () => {
    assert.equal(describeSize(phone, desktop, "--dg-body"), "16 px");
  });

  test("gives both sizes when the token changes at 768 px", () => {
    assert.equal(describeSize(phone, desktop, "--dg-wordmark"), "28 px · 36 px from 768");
  });

  test("gives the bounds of a fluid clamp()", () => {
    assert.equal(describeSize(phone, desktop, "--dg-hero"), "30 to 72 px, fluid");
  });

  test("throws on a size it can't read, rather than showing a wrong one", () => {
    assert.throws(() => describeSize(phone, desktop, "--dg-odd"), /larger/);
    assert.throws(() => describeSize(phone, desktop, "--dg-missing"), /--dg-missing/);
  });
});

describe("describeColour", () => {
  const colours = parseTokens(
    `:root {
      --dg-ink: #07080D;
      --dg-bg: var(--dg-ink);
      --dg-glass: color-mix(in srgb, var(--dg-ink) 82%, transparent);
    }`,
    360,
  );

  test("leaves a primitive's hex as written", () => {
    assert.equal(describeColour(colours, "--dg-ink"), "#07080D");
  });

  test("names the primitive a semantic token points at", () => {
    assert.equal(describeColour(colours, "--dg-bg"), "ink");
  });

  test("gives a color-mix() as the primitive and its opacity", () => {
    assert.equal(describeColour(colours, "--dg-glass"), "ink at 82%");
  });

  test("throws on a token that isn't defined", () => {
    assert.throws(() => describeColour(colours, "--dg-missing"), /--dg-missing/);
  });
});
