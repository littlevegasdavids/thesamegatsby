import assert from "node:assert/strict";
import { describe, test } from "node:test";
import imageLoader, { COVER_WIDTHS } from "../src/app/image-loader.ts";
import { MEDIA_ORIGIN } from "../src/catalogue/media.ts";

const COVER = `${MEDIA_ORIGIN}/covers/welcome-to-vapor-city.be5bb22c.768.webp`;
const at = (width: number) => `${MEDIA_ORIGIN}/covers/welcome-to-vapor-city.be5bb22c.${width}.webp`;

describe("imageLoader, for a cover on the media domain", () => {
  test("the built widths are media-pipeline's four", () => {
    assert.deepEqual(COVER_WIDTHS, [192, 384, 768, 1080]);
  });

  test("picks the smallest built width at or above the one asked for", () => {
    const cases: [number, number][] = [
      [16, 192],
      [64, 192],
      [128, 192],
      [192, 192],
      [193, 384],
      [384, 384],
      [640, 768],
      [768, 768],
      [828, 1080],
      [1080, 1080],
    ];
    for (const [asked, built] of cases) assert.equal(imageLoader({ src: COVER, width: asked }), at(built), `width ${asked}`);
  });

  test("gives the largest built width when more is asked for", () => {
    assert.equal(imageLoader({ src: COVER, width: 1920 }), at(1080));
    assert.equal(imageLoader({ src: COVER, width: 3840 }), at(1080));
  });

  test("starts from any built width, and keeps the format", () => {
    const avif = `${MEDIA_ORIGIN}/covers/cant-you-see-ep.9b04d7aa.192.avif`;
    assert.equal(imageLoader({ src: avif, width: 640 }), `${MEDIA_ORIGIN}/covers/cant-you-see-ep.9b04d7aa.768.avif`);
  });

  test("ignores the quality, since the files are encoded once", () => {
    assert.equal(imageLoader({ src: COVER, width: 64, quality: 40 }), at(192));
  });
});

describe("imageLoader, for anything else", () => {
  test("passes a local file through with ?w=", () => {
    assert.equal(imageLoader({ src: "/system-fixtures/cant-you-see.jpg", width: 128 }), "/system-fixtures/cant-you-see.jpg?w=128");
  });

  test("adds &w= to a URL that already has a query", () => {
    assert.equal(imageLoader({ src: "/a.svg?v=2", width: 64 }), "/a.svg?v=2&w=64");
  });

  test("passes a media-domain file that isn't a sized cover through", () => {
    const other = `${MEDIA_ORIGIN}/probe.txt`;
    assert.equal(imageLoader({ src: other, width: 64 }), `${other}?w=64`);
  });

  test("passes a lookalike host through, untouched but for ?w=", () => {
    const lookalike = "https://media.thesamegatsby.com.example/covers/x.12345678.768.webp";
    assert.equal(imageLoader({ src: lookalike, width: 64 }), `${lookalike}?w=64`);
  });
});
