import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";
import {
  FORMATS,
  STORY_SAFE,
  centreCrop,
  fileName,
  fitTitle,
  isImageFile,
  kitLayout,
  kitTracks,
} from "../src/app/kit/artwork.ts";
import { catalogue } from "../src/catalogue/index.ts";
import type { Catalogue } from "../src/catalogue/types.ts";

const measure = (text: string, size: number) => text.length * size * 0.6;

describe("the formats", () => {
  test("are the post and story sizes SPEC.md names", () => {
    assert.deepEqual(FORMATS.post, { width: 1080, height: 1350 });
    assert.deepEqual(FORMATS.story, { width: 1080, height: 1920 });
  });

  test("name their files after the track", () => {
    assert.equal(fileName("ukg-333", "post"), "deja-gatsby-ukg-333-post.png");
    assert.equal(fileName("ukg-333", "story"), "deja-gatsby-ukg-333-story.png");
  });
});

describe("kitTracks", () => {
  const tracks = kitTracks(catalogue);

  test("lists every track, newest release first", () => {
    assert.deepEqual(tracks.map(({ id }) => id), [
      "welcome-to-vapor-city",
      "give-me-that-kaizen",
      "you-who-could-be-forever",
      "cant-you-see",
      "ukg-333",
      "bring-that-change",
    ]);
  });

  test("uses each release's 1080 px WebP cover, on the media domain", () => {
    for (const track of tracks) assert.match(track.cover, /^https:\/\/media\.thesamegatsby\.com\/covers\/.+\.1080\.webp$/);
    assert.equal(tracks[3].cover, tracks[4].cover, "an EP's tracks share its cover");
  });

  test("labels a track by its release type", () => {
    assert.equal(tracks[0].label, "NEW SINGLE");
    assert.equal(tracks[4].label, "NEW EP");
  });

  test("labels a remix or edit single by its kind, and an album as an album", () => {
    const [release] = catalogue.releases;
    const withKind = (kind: "remix" | "edit"): Catalogue => ({ releases: [{ ...release, tracks: [{ ...release.tracks[0], kind }] }] });
    assert.equal(kitTracks(withKind("remix"))[0].label, "NEW REMIX");
    assert.equal(kitTracks(withKind("edit"))[0].label, "NEW EDIT");
    assert.equal(kitTracks({ releases: [{ ...release, type: "album" }] })[0].label, "NEW ALBUM");
  });

  test("is plain data, so the server can pass it to the client", () => {
    assert.deepEqual(JSON.parse(JSON.stringify(tracks)), tracks);
  });
});

describe("fitTitle", () => {
  test("keeps a short title on one line at the largest size", () => {
    assert.deepEqual(fitTitle("UKG 333", { width: 920, height: 200, maxLines: 2 }, measure), { size: 112, lines: ["UKG 333"] });
  });

  test("wraps on spaces, inside the width, the height and the line limit", () => {
    const box = { width: 920, height: 190, maxLines: 2 };
    const { size, lines } = fitTitle("You who could be Forever", box, measure);
    assert.ok(lines.length <= 2);
    assert.equal(lines.join(" "), "You who could be Forever");
    for (const line of lines) assert.ok(measure(line, size) <= box.width, line);
    assert.ok(lines.length * size * 1.08 <= box.height);
  });

  test("shrinks a long word to fit rather than breaking it", () => {
    const { size, lines } = fitTitle("Supercalifragilisticexpialidocious", { width: 920, height: 200, maxLines: 2 }, measure);
    assert.deepEqual(lines, ["Supercalifragilisticexpialidocious"]);
    assert.ok(measure(lines[0], size) <= 920);
  });
});

test("centreCrop takes the largest centred square", () => {
  assert.deepEqual(centreCrop(1600, 1000), { x: 300, y: 0, side: 1000 });
  assert.deepEqual(centreCrop(1000, 1600), { x: 0, y: 300, side: 1000 });
  assert.deepEqual(centreCrop(1080, 1080), { x: 0, y: 0, side: 1080 });
});

test("only an image counts as a cover", () => {
  assert.equal(isImageFile({ type: "image/png" }), true);
  assert.equal(isImageFile({ type: "image/webp" }), true);
  assert.equal(isImageFile({ type: "application/pdf" }), false);
  assert.equal(isImageFile({ type: "" }), false);
});

describe("kitLayout", () => {
  for (const format of ["post", "story"] as const) {
    const size = FORMATS[format];
    const layout = kitLayout(format);
    const blocks = { wordmark: layout.wordmark, label: layout.label, title: layout.title };

    test(`${format}: the cover is 920 px square, 80 px from each side`, () => {
      assert.deepEqual([layout.cover.x, layout.cover.width, layout.cover.height], [80, 920, 920]);
    });

    test(`${format}: everything stays on the canvas, inside the margins`, () => {
      for (const [name, b] of [...Object.entries(blocks), ["cover", layout.cover] as const]) {
        assert.ok(b.x >= 80 && b.x + b.width <= size.width - 80, `${name} across`);
        assert.ok(b.y >= 0 && b.y + b.height <= size.height, `${name} down`);
      }
    });

    test(`${format}: nothing overlaps the cover or each other`, () => {
      const all = [layout.cover, ...Object.values(blocks)].sort((a, b) => a.y - b.y);
      for (let i = 1; i < all.length; i++) assert.ok(all[i - 1].y + all[i - 1].height <= all[i].y, `block ${i}`);
    });
  }

  test("post: runs cover, label, title, wordmark", () => {
    const { cover, label, title, wordmark } = kitLayout("post");
    assert.ok(cover.y < label.y && label.y < title.y && title.y < wordmark.y);
  });

  test("story: runs wordmark, cover, label, title, inside the safe area", () => {
    const { cover, label, title, wordmark } = kitLayout("story");
    assert.ok(wordmark.y < cover.y && cover.y < label.y && label.y < title.y);
    assert.ok(wordmark.y >= STORY_SAFE.top);
    assert.ok(title.y + title.height <= FORMATS.story.height - STORY_SAFE.bottom);
  });

  test("allows two title lines on the post and three on the story", () => {
    assert.equal(kitLayout("post").titleLines, 2);
    assert.equal(kitLayout("story").titleLines, 3);
  });
});

test("the homepage doesn't import the kit", () => {
  for (const file of ["page.tsx", "home/Home.tsx", "layout.tsx"]) {
    const source = readFileSync(new URL(`../src/app/${file}`, import.meta.url), "utf8");
    assert.doesNotMatch(source, /["'][^"']*kit[/"']/, file);
  }
});
