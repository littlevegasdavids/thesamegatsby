import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { markSrc } from "../src/app/marks.ts";

const asset = (name: string) =>
  readFileSync(new URL(`../src/design-system/assets/${name}.svg`, import.meta.url), "utf8");

test("hands next/og each mark as an SVG data URI of its own file", () => {
  for (const name of ["wordmark", "sparkle-star"] as const) {
    const src = markSrc(name);
    const prefix = "data:image/svg+xml;base64,";
    assert.ok(src.startsWith(prefix), `${name} isn't an SVG data URI`);
    assert.equal(Buffer.from(src.slice(prefix.length), "base64").toString("utf8"), asset(name));
  }
});
