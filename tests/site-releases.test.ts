import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { heroRelease, homeReleases, SOCIALS } from "../src/app/home/releases.ts";
import { catalogue } from "../src/catalogue/index.ts";
import { MEDIA_ORIGIN } from "../src/catalogue/media.ts";
import type { Catalogue, CatalogueRelease } from "../src/catalogue/types.ts";

describe("homeReleases, on the committed catalogue", () => {
  const releases = homeReleases(catalogue);

  test("keeps the five releases, newest first", () => {
    assert.deepEqual(
      releases.map((r) => r.id),
      ["welcome-to-vapor-city", "give-me-that-kaizen", "you-who-could-be-forever", "cant-you-see-ep", "bring-that-change"],
    );
  });

  test("points each cover at its 1080 px WebP on the media domain", () => {
    for (const [i, release] of releases.entries()) {
      assert.equal(release.cover, `${MEDIA_ORIGIN}/${catalogue.releases[i].cover.key}.1080.webp`);
    }
  });

  test("gives every track its snippet's 30 s and its kind, in tracklist order", () => {
    const ep = releases.find((r) => r.id === "cant-you-see-ep")!;
    assert.equal(ep.type, "ep");
    assert.equal(ep.leadTrackId, "cant-you-see");
    assert.deepEqual(ep.tracks, [
      { id: "cant-you-see", title: "Can't You See", kind: "original", duration: 30 },
      { id: "ukg-333", title: "UKG 333", kind: "original", duration: 30 },
    ]);
    for (const track of releases.flatMap((r) => r.tracks)) assert.equal(track.duration, 30);
  });

  test("carries the links over as they are", () => {
    for (const [i, release] of releases.entries()) {
      assert.deepEqual(release.links, catalogue.releases[i].links);
    }
  });

  test("passes only the view fields, so no snippet key or date reaches the client", () => {
    for (const release of releases) {
      assert.deepEqual(Object.keys(release).sort(), ["cover", "id", "leadTrackId", "links", "title", "tracks", "type"]);
      for (const track of release.tracks) assert.deepEqual(Object.keys(track).sort(), ["duration", "id", "kind", "title"]);
    }
  });
});

const release = (id: string, date: string, extra: Partial<CatalogueRelease> = {}): CatalogueRelease => ({
  ...catalogue.releases[0],
  id,
  date,
  ...extra,
});

describe("heroRelease", () => {
  test("is Welcome to Vapor_City, the newest, on the committed catalogue", () => {
    assert.equal(heroRelease(catalogue).id, "welcome-to-vapor-city");
  });

  test("is the newest release when none is featured, whatever the list order", () => {
    const c: Catalogue = { releases: [release("old", "2020-01-01"), release("new", "2024-05-05"), release("mid", "2022-02-02")] };
    assert.equal(heroRelease(c).id, "new");
  });

  test("is the featured release when one is", () => {
    const c: Catalogue = { releases: [release("new", "2024-05-05"), release("old", "2020-01-01", { featured: true })] };
    assert.equal(heroRelease(c).id, "old");
  });

  test("throws on an empty catalogue", () => {
    assert.throws(() => heroRelease({ releases: [] }), /no releases/);
  });
});

describe("homeReleases, on a cover it can't use", () => {
  test("throws, naming the release, when there's no 1080 px WebP", () => {
    const noWebp = release("no-webp", "2024-01-01", { cover: { ...catalogue.releases[0].cover, formats: ["avif"] } });
    assert.throws(() => homeReleases({ releases: [noWebp] }), /no-webp/);
    const no1080 = release("no-1080", "2024-01-01", { cover: { ...catalogue.releases[0].cover, widths: [192, 384, 768] } });
    assert.throws(() => homeReleases({ releases: [no1080] }), /no-1080/);
  });
});

describe("SOCIALS", () => {
  test("are Instagram and TikTok, both @thesamegatsby", () => {
    assert.deepEqual(SOCIALS, [
      { network: "instagram", handle: "thesamegatsby", url: "https://www.instagram.com/thesamegatsby" },
      { network: "tiktok", handle: "thesamegatsby", url: "https://www.tiktok.com/@thesamegatsby" },
    ]);
  });
});
