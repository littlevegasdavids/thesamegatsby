import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { token, tokenValue } from "../src/app/tokens.ts";

const CSS = `
/* --dg-commented: #123456; */
:root {
  --dg-ink: #07080D;
  --dg-bg: var(--dg-ink);
  --dg-page: var(--dg-bg);
  --dg-mix: color-mix(in srgb, var(--dg-ink) 50%, transparent);
  --dg-loop-a: var(--dg-loop-b);
  --dg-loop-b: var(--dg-loop-a);
  --dg-missing: var(--dg-nowhere);
  --dg-space: 4px;
}

@media (min-width: 768px) {
  :root {
    --dg-space: 8px;
  }
}
`;

describe("tokenValue", () => {
  test("reads a plain value", () => {
    assert.equal(tokenValue(CSS, "--dg-ink"), "#07080D");
  });

  test("follows a chain of var()s to its value", () => {
    assert.equal(tokenValue(CSS, "--dg-bg"), "#07080D");
    assert.equal(tokenValue(CSS, "--dg-page"), "#07080D");
  });

  test("resolves a var() inside a larger value", () => {
    assert.equal(tokenValue(CSS, "--dg-mix"), "color-mix(in srgb, #07080D 50%, transparent)");
  });

  test("takes the phone value, the first written, over the 768 px one", () => {
    assert.equal(tokenValue(CSS, "--dg-space"), "4px");
  });

  test("ignores comments", () => {
    assert.throws(() => tokenValue(CSS, "--dg-commented"), /--dg-commented/);
  });

  test("throws on an unknown token, a missing link and a loop, naming it", () => {
    assert.throws(() => tokenValue(CSS, "--dg-nope"), /--dg-nope/);
    assert.throws(() => tokenValue(CSS, "--dg-missing"), /--dg-nowhere/);
    assert.throws(() => tokenValue(CSS, "--dg-loop-a"), /loop/);
  });
});

describe("token, from the real tokens.css", () => {
  test("reads the page's ground and the star's colour", () => {
    assert.equal(token("--dg-bg"), "#07080D");
    assert.equal(token("--dg-star"), "#F4E409");
  });
});
