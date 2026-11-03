import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";
import { parseTokens } from "../src/design-system/contrast.ts";
import { SHADOWS, TEXTURES } from "../src/app/system/sections/textures.ts";

const read = (path: string) => readFileSync(new URL(`../src/design-system/${path}`, import.meta.url), "utf8");
const tokens = parseTokens(read("tokens.css"), 360);

describe("/system textures section", () => {
  test("has a sample for every utility in textures.css", () => {
    const utilities = [...new Set(read("textures.css").match(/\.dg-[\w-]+/g))];
    assert.deepEqual(TEXTURES.map((sample) => `.${sample.utility}`).sort(), utilities.sort());
  });

  // The grid's tokens are shown with the backdrop they draw (DS-8).
  test("shows every shadow, glow, tape and texture token", () => {
    const textureTokens = [...tokens.keys()].filter((name) =>
      /^--dg-(?:shadow|glow|tape|scanline|vignette|grain|glass-filter)/.test(name));
    const shown = [...TEXTURES.flatMap((sample) => sample.tokens), ...SHADOWS.map((shadow) => shadow.token)];
    assert.deepEqual([...new Set(shown)].sort(), textureTokens.sort());
  });
});
