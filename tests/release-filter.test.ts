import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { releaseCategory, releaseFilterOptions } from "../src/design-system/release-filter.ts";
import type { Release, ReleaseType, TrackKind } from "../src/design-system/types.ts";
import { FIXTURE_RELEASES } from "../src/app/system/fixtures.ts";

let next = 0;

// A release with one track per kind given, the first one the lead.
function release(type: ReleaseType, ...kinds: TrackKind[]): Release {
  const id = `r${next++}`;
  const tracks = kinds.map((kind, i) => ({ id: `${id}-t${i}`, title: `Track ${i + 1}`, kind, duration: 30 }));
  return { id, type, title: id, cover: "/cover.jpg", tracks, leadTrackId: tracks[0].id, links: [] };
}

const counts = (releases: readonly Release[]) =>
  releaseFilterOptions(releases).map(({ key, count }) => [key, count] as const);

describe("releaseCategory", () => {
  test("an original single is a single", () => {
    assert.equal(releaseCategory(release("single", "original")), "single");
  });

  test("a single whose track is a remix or an edit counts as a remix (G6)", () => {
    assert.equal(releaseCategory(release("single", "remix")), "remix");
    assert.equal(releaseCategory(release("single", "edit")), "remix");
  });

  test("an EP or album keeps its own type, even when it holds a remix", () => {
    assert.equal(releaseCategory(release("ep", "original", "remix")), "ep");
    assert.equal(releaseCategory(release("album", "remix", "edit", "original")), "album");
  });

  test("a single is judged by its lead track", () => {
    const single = release("single", "original", "remix");
    assert.equal(releaseCategory(single), "single");
    assert.equal(releaseCategory({ ...single, leadTrackId: single.tracks[1].id }), "remix");
  });
});

describe("releaseFilterOptions", () => {
  test("puts All first, counting every release", () => {
    const options = releaseFilterOptions([release("single", "original"), release("ep", "original", "original")]);
    assert.deepEqual(options[0], { key: "all", label: "All", count: 2 });
  });

  test("lists the types in a fixed order, each with its label and count", () => {
    const options = releaseFilterOptions([
      release("single", "edit"),
      release("album", "original"),
      release("ep", "original"),
      release("single", "original"),
      release("single", "original"),
    ]);
    assert.deepEqual(options, [
      { key: "all", label: "All", count: 5 },
      { key: "single", label: "Singles", count: 2 },
      { key: "ep", label: "EPs", count: 1 },
      { key: "album", label: "Albums", count: 1 },
      { key: "remix", label: "Remixes & edits", count: 1 },
    ]);
  });

  test("leaves out a type with no releases", () => {
    assert.deepEqual(counts([release("single", "original"), release("ep", "original", "original")]), [
      ["all", 2],
      ["single", 1],
      ["ep", 1],
    ]);
  });

  test("counts a remix single under Remixes & edits, not Singles", () => {
    assert.deepEqual(counts([release("single", "remix"), release("single", "edit")]), [
      ["all", 2],
      ["remix", 2],
    ]);
  });

  test("counts each release once, so the types add up to All", () => {
    const options = releaseFilterOptions(FIXTURE_RELEASES);
    const [all, ...types] = options;
    assert.equal(types.reduce((sum, { count }) => sum + count, 0), all.count);
  });

  test("with no releases, offers All alone", () => {
    assert.deepEqual(releaseFilterOptions([]), [{ key: "all", label: "All", count: 0 }]);
  });

  test("gives the canvas's counts for the fixture: 8, 4, 1, 1 and 2", () => {
    assert.deepEqual(counts(FIXTURE_RELEASES), [
      ["all", 8],
      ["single", 4],
      ["ep", 1],
      ["album", 1],
      ["remix", 2],
    ]);
  });
});
