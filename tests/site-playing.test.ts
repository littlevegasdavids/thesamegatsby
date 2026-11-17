import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { barTrack, opensElsewhere, pageState, shouldStop } from "../src/app/home/playing.ts";
import { homeReleases } from "../src/app/home/releases.ts";
import type { Playback } from "../src/audio/state.ts";
import { catalogue } from "../src/catalogue/index.ts";

const RELEASES = homeReleases(catalogue);
const at = (trackId: string, phase: "loading" | "playing" | "ended", extra: Partial<NonNullable<Playback>> = {}): Playback => ({
  trackId,
  phase,
  elapsed: 9,
  duration: 30,
  barOpen: true,
  failed: false,
  ...extra,
});

describe("pageState", () => {
  test("is empty while nothing has played", () => {
    assert.deepEqual(pageState(null), { playingTrackId: null, playState: undefined, elapsed: 0 });
  });

  test("gives the components the track, its row state and the time", () => {
    assert.deepEqual(pageState(at("ukg-333", "loading", { elapsed: 0 })), { playingTrackId: "ukg-333", playState: "loading", elapsed: 0 });
    assert.deepEqual(pageState(at("ukg-333", "playing")), { playingTrackId: "ukg-333", playState: "playing", elapsed: 9 });
    assert.deepEqual(pageState(at("ukg-333", "ended", { elapsed: 30 })), { playingTrackId: "ukg-333", playState: "played", elapsed: 30 });
  });

  test("keeps the played look after the bar is closed", () => {
    assert.equal(pageState(at("ukg-333", "ended", { barOpen: false })).playState, "played");
  });
});

describe("shouldStop", () => {
  test("stops a tapped track that's loading or playing", () => {
    assert.equal(shouldStop(at("ukg-333", "loading"), "ukg-333"), true);
    assert.equal(shouldStop(at("ukg-333", "playing"), "ukg-333"), true);
  });

  test("plays any other track, and the same one again once it's ended", () => {
    assert.equal(shouldStop(null, "ukg-333"), false);
    assert.equal(shouldStop(at("ukg-333", "playing"), "cant-you-see"), false);
    assert.equal(shouldStop(at("ukg-333", "ended"), "ukg-333"), false);
  });
});

describe("barTrack", () => {
  test("is nothing while the bar is hidden", () => {
    assert.equal(barTrack(null, RELEASES), null);
    assert.equal(barTrack(at("ukg-333", "ended", { barOpen: false }), RELEASES), null);
  });

  test("gives the track's title, its release's cover and links, and the bar's state", () => {
    const ep = RELEASES.find((r) => r.id === "cant-you-see-ep")!;
    assert.deepEqual(barTrack(at("ukg-333", "playing"), RELEASES), {
      track: { title: "UKG 333", cover: ep.cover },
      state: "playing",
      links: ep.links,
    });
  });

  test("shows a failed snippet as ended, so the links are still there", () => {
    assert.equal(barTrack(at("ukg-333", "ended", { failed: true }), RELEASES)?.state, "ended");
  });

  test("throws on a track the page doesn't list", () => {
    assert.throws(() => barTrack(at("nope", "playing"), RELEASES), /nope/);
  });
});

describe("opensElsewhere", () => {
  const link = (attrs: Record<string, string>) => ({ closest: (selector: string) => (selector === "a[href]" ? { getAttribute: (name: string) => attrs[name] ?? null } : null) });

  test("is true for a link that opens in a new tab", () => {
    assert.equal(opensElsewhere(link({ href: "https://open.spotify.com/x", target: "_blank" })), true);
  });

  test("is false for a same-tab link, a mailto, and anything that isn't a link", () => {
    assert.equal(opensElsewhere(link({ href: "/system" })), false);
    assert.equal(opensElsewhere(link({ href: "mailto:a@b.c" })), false);
    assert.equal(opensElsewhere({ closest: () => null }), false);
    assert.equal(opensElsewhere(null), false);
  });
});
