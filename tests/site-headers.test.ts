import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

// SITE-4: next/og writes the share image and the apple-touch icon into out/
// with no extension, so Workers Static Assets sends no Content-Type for them,
// and _headers' nosniff would leave a crawler or iOS to refuse them.
const rules = readFileSync(new URL("../public/_headers", import.meta.url), "utf8")
  .split(/\n\s*\n/)
  .map((block) => block.split("\n").filter((line) => line.trim() !== "" && !line.trim().startsWith("#")))
  .filter((lines) => lines.length > 0);

function headersFor(path: string): string[] {
  const rule = rules.find(([pattern]) => pattern.trim() === path);
  assert.ok(rule, `_headers has no rule for ${path}`);
  return rule.slice(1).map((line) => line.trim());
}

test("names the PNG type of the extensionless images", () => {
  for (const path of ["/opengraph-image", "/apple-icon"]) {
    assert.deepEqual(headersFor(path), ["Content-Type: image/png"]);
  }
});
