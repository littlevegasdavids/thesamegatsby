import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { test } from "node:test";

// MP-11: the catalogue in src/catalogue replaced the old site's songs list and
// the 21 MB of masters-turned-snippets under public/music.
const root = join(import.meta.dirname, "..");

async function sourceFiles(dir: string): Promise<string[]> {
  const entries = await readdir(join(root, dir), { withFileTypes: true, recursive: true });
  return entries
    .filter((e) => e.isFile() && /\.(ts|tsx|css|json)$/.test(e.name))
    .map((e) => join(e.parentPath, e.name));
}

test("the old songs list and public/music are gone", () => {
  assert.equal(existsSync(join(root, "songs")), false, "songs/ still exists");
  assert.equal(existsSync(join(root, "public", "music")), false, "public/music/ still exists");
});

test("nothing in src/ or scripts/ points at them", async () => {
  for (const file of [...(await sourceFiles("src")), ...(await sourceFiles("scripts"))]) {
    const text = await readFile(file, "utf8");
    assert.doesNotMatch(text, /["'`](\.\.\/)+songs\b/, `${file} imports the old songs list`);
    assert.doesNotMatch(text, /["'`]\/music\//, `${file} points at /music/`);
  }
});

// SITE-5: the homepage replaced /bench (SPEC-audio-engine.md, open question
// 5), and nothing on the new site uses the old site's two images.
test("/bench and the old site's images are gone", () => {
  for (const path of [["src", "app", "bench"], ["public", "background.webp"], ["public", "profile_pic.jpg"]]) {
    assert.equal(existsSync(join(root, ...path)), false, `${path.join("/")} still exists`);
  }
});
