import assert from "node:assert/strict";
import { existsSync, statSync } from "node:fs";
import { describe, test } from "node:test";
import { FIXTURE_RELEASES, FIXTURE_SOCIALS } from "../src/app/system/fixtures.ts";

const publicFile = (src: string) => new URL(`../public${src}`, import.meta.url);
const covers = [...new Set(FIXTURE_RELEASES.map(({ cover }) => cover))];

describe("the /system fixture", () => {
  test("lists the releases in the order of Main.dc.html's discography, examples on", () => {
    assert.deepEqual(
      FIXTURE_RELEASES.map(({ type, title }) => `${type}: ${title}`),
      [
        "album: [Album title]",
        "single: Welcome to Vapor_City",
        "single: [Track title] (Edit)",
        "single: Give me that KaiZen",
        "single: You who could be Forever",
        "single: [Track title] ([Artist] Remix)",
        "ep: Can't You See",
        "single: Bring That Change",
      ],
    );
  });

  test("gives the bracketed album eight tracks and the EP its two", () => {
    const tracks = (title: string) => FIXTURE_RELEASES.find((r) => r.title === title)?.tracks.map((t) => t.title);
    assert.equal(tracks("[Album title]")?.length, 8);
    assert.deepEqual(tracks("Can't You See"), ["Can't You See", "UKG 333"]);
  });

  test("leads each release with one of its own tracks", () => {
    for (const { title, tracks, leadTrackId } of FIXTURE_RELEASES) {
      assert.ok(
        tracks.some(({ id }) => id === leadTrackId),
        `${title}'s lead track isn't one of its tracks`,
      );
    }
  });

  test("uses each release id once, and each track id once", () => {
    const releases = FIXTURE_RELEASES.map((r) => r.id);
    const tracks = FIXTURE_RELEASES.flatMap((r) => r.tracks.map((t) => t.id));
    assert.equal(new Set(releases).size, releases.length);
    assert.equal(new Set(tracks).size, tracks.length);
  });

  test("gives the bracketed releases all three More platforms, so More can be shown", () => {
    for (const release of FIXTURE_RELEASES.filter((r) => r.title.startsWith("["))) {
      const platforms = release.links.map((l) => l.platform);
      for (const extra of ["amazon-music", "deezer", "tidal"] as const) {
        assert.ok(platforms.includes(extra), `${release.title} has no ${extra} link`);
      }
    }
  });

  test("links every real release to all five main platforms", () => {
    for (const release of FIXTURE_RELEASES.filter((r) => !r.title.startsWith("["))) {
      assert.deepEqual(
        release.links.map((l) => l.platform),
        ["spotify", "apple-music", "youtube-music", "soundcloud", "bandcamp"],
        release.title,
      );
    }
  });

  test("points every cover at a file in public/", () => {
    for (const cover of covers) assert.ok(existsSync(publicFile(cover)), `${cover} is missing`);
  });

  test("keeps the covers under 200 KB in all", () => {
    const total = covers.reduce((sum, cover) => sum + statSync(publicFile(cover)).size, 0);
    assert.ok(total < 200 * 1024, `the covers total ${total} bytes`);
  });

  test("lists Instagram, then TikTok, both @thesamegatsby", () => {
    assert.deepEqual(
      FIXTURE_SOCIALS.map(({ network, handle }) => `${network} @${handle}`),
      ["instagram @thesamegatsby", "tiktok @thesamegatsby"],
    );
  });
});
