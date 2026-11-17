import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { ARTWORK_WIDTHS, tracksFrom } from "../src/audio/tracks.ts";
import { catalogue } from "../src/catalogue/index.ts";
import { MEDIA_ORIGIN } from "../src/catalogue/media.ts";
import type { Catalogue } from "../src/catalogue/types.ts";

describe("tracksFrom, on the committed catalogue", () => {
  const tracks = tracksFrom(catalogue);

  test("gives one track per catalogue track, with unique ids, in catalogue order", () => {
    assert.deepEqual(
      tracks.map((t) => t.id),
      ["welcome-to-vapor-city", "give-me-that-kaizen", "you-who-could-be-forever", "cant-you-see", "ukg-333", "bring-that-change"],
    );
  });

  test("points every snippet and artwork URL at the media domain", () => {
    for (const track of tracks) {
      assert.ok(track.src.startsWith(`${MEDIA_ORIGIN}/snippets/${track.id}.`), track.src);
      assert.match(track.src, /\.m4a$/);
      for (const image of track.artwork) assert.ok(image.src.startsWith(`${MEDIA_ORIGIN}/covers/`), image.src);
    }
  });

  test("takes the title, and the catalogue's 30 s duration", () => {
    const kaizen = tracks.find((t) => t.id === "give-me-that-kaizen")!;
    assert.equal(kaizen.title, "Give me that KaiZen");
    assert.equal(kaizen.duration, 30);
  });

  test("gives a track on an EP the EP's title as its album, and the EP's cover", () => {
    const ukg = tracks.find((t) => t.id === "ukg-333")!;
    const cys = tracks.find((t) => t.id === "cant-you-see")!;
    assert.equal(ukg.album, "Can't You See");
    assert.deepEqual(ukg.artwork, cys.artwork);
    assert.ok(ukg.artwork[0].src.includes("/covers/cant-you-see-ep."), ukg.artwork[0].src);
  });

  test("lists the cover's WebP at 192, 384 and 768 px as lock-screen artwork", () => {
    assert.deepEqual(ARTWORK_WIDTHS, [192, 384, 768]);
    const vapor = tracks.find((t) => t.id === "welcome-to-vapor-city")!;
    assert.deepEqual(vapor.artwork, [
      { src: `${MEDIA_ORIGIN}/covers/welcome-to-vapor-city.be5bb22c.192.webp`, sizes: "192x192", type: "image/webp" },
      { src: `${MEDIA_ORIGIN}/covers/welcome-to-vapor-city.be5bb22c.384.webp`, sizes: "384x384", type: "image/webp" },
      { src: `${MEDIA_ORIGIN}/covers/welcome-to-vapor-city.be5bb22c.768.webp`, sizes: "768x768", type: "image/webp" },
    ]);
  });

  test("is plain data, so a server component can pass it to the client", () => {
    assert.deepEqual(JSON.parse(JSON.stringify(tracks)), tracks);
  });
});

test("tracksFrom leaves out an artwork width the cover wasn't built at", () => {
  const release = catalogue.releases[0];
  const narrow: Catalogue = { releases: [{ ...release, cover: { ...release.cover, widths: [192, 1080] } }] };
  assert.deepEqual(
    tracksFrom(narrow)[0].artwork.map((image) => image.sizes),
    ["192x192"],
  );
});
