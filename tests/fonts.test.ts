import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, test } from "node:test";
import { fileURLToPath } from "node:url";

// SPEC-design-system.md › Fonts: four self-hosted WOFF2 subsets, each OFL
// font with its licence beside it. src/design-system/fonts.ts declares them.
const FONTS = fileURLToPath(new URL("../src/design-system/fonts", import.meta.url));
const FILES = ["aero.woff2", "chakra-petch-400.woff2", "chakra-petch-600.woff2", "vt323-400.woff2"];
// Bytes, taking the stricter reading of "90 KB".
const BUDGET = 90_000;

describe("fonts", () => {
  test("are the four files the spec names, and no others", () => {
    const woff2 = readdirSync(FONTS).filter((name) => name.endsWith(".woff2")).sort();
    assert.deepEqual(woff2, FILES);
  });

  test("are WOFF2, not renamed TTFs", () => {
    for (const name of FILES) {
      const signature = readFileSync(join(FONTS, name)).subarray(0, 4).toString("latin1");
      assert.equal(signature, "wOF2", name);
    }
  });

  test("total 90 KB or less", () => {
    const total = FILES.reduce((sum, name) => sum + statSync(join(FONTS, name)).size, 0);
    assert.ok(total <= BUDGET, `${total} bytes is over the ${BUDGET}-byte budget`);
  });

  test("each OFL font has its licence beside it", () => {
    for (const name of ["OFL-chakra-petch.txt", "OFL-vt323.txt"]) {
      const text = readFileSync(join(FONTS, name), "utf8");
      assert.match(text, /SIL Open Font License, Version 1\.1/, name);
    }
  });
});
