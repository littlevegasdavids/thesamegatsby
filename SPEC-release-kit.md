# Spec: release-kit

Module of the [Déjà Gatsby rebuild](SPEC.md). Depends on `design-system` for the tokens, fonts and marks, and on `media-pipeline` for the catalogue and its covers.

**Written 18 Nov 2026 and built straight away,** because Reno asked to finish everything that can be finished now. No canvas board draws the artwork, so its composition is marked **(new)** for him to accept or change.

## Objective

Reno opens an unlinked page, picks a track, optionally swaps in another cover, and downloads a post and a story as PNGs, ready for Instagram and TikTok.

## How it works

- **Route:** `/kit`, unlinked and `noindex`. The homepage loads none of its code (SPEC.md, assumption 6).
- **Tracks:** every track in the catalogue, newest release first, built on the server as plain data. The client never imports the catalogue's validation.
- **Cover:** the release's 1080 px WebP from the media domain, or a file Reno picks. A picked file stays in the browser and is never uploaded. It's centre-cropped to a square, and a note shows when its short side is under 1080 px.
- **Output:** PNGs of exactly **1080 × 1350** (post) and **1080 × 1920** (story), drawn on a canvas. The live preview is the same canvas, so what's shown is what's downloaded.
- **File names:** `deja-gatsby-<track-id>-post.png` and `deja-gatsby-<track-id>-story.png`.
- **CORS:** media covers load with `crossOrigin="anonymous"`, which the media domain's `Access-Control-Allow-Origin: *` allows, so the canvas can export.

## The artwork **(new)**

- **Ground:** the site's night sky, with its grid and glow.
- **Cover:** 920 px square, 80 px from each side, rounded, with its hairline and glow. **Nothing is drawn over it** (SPEC.md).
- **Label:** the sparkle and "NEW SINGLE", "NEW EP", "NEW ALBUM", "NEW REMIX" or "NEW EDIT" in VT323, amber.
- **Title:** the track's title in Aero with the V5 stacked tape, as large as fits: two lines at most on the post, and three on the story.
- **Wordmark:** the outlined V5 wordmark.
- **Post:** cover, label, title, wordmark, top to bottom.
- **Story:** wordmark, cover, label, title, all inside the area Instagram leaves clear: 250 px from the top and 340 px from the bottom.

## Code

`src/app/kit/`: `page.tsx` (server), `Kit.tsx` (client), `artwork.ts` (pure layout and data, tested; a file named `layout.ts` would be a Next route layout), `draw.ts` (canvas drawing) and `kit.module.css`. Colours come from the tokens at run time, so no raw values enter the code.

## Testing

| Level | What | How |
|---|---|---|
| Unit | Formats, track data, labels, file names, title fitting, the crop, each layout staying in bounds and clear of the cover, and `/` not importing the kit | `npm test` |
| Browser | Each track renders, both PNGs decode at the exact size, an uploaded file replaces the cover, and a non-image is refused, with no console errors | Headless Brave against the built site |

## Boundaries

- **Always:** keep picked files in the browser.
- **Ask first:** adding a dependency, or uploading anything.
- **Never:** draw over cover art, or let `/` load the kit.

## Success criteria

- [x] `/kit` lists all six tracks, and exports a post and a story at exactly 1080 × 1350 and 1080 × 1920. *All 12 PNGs decoded at those sizes in headless Brave, and the Download button saved a correctly named file.*
- [x] A picked image replaces the cover, centre-cropped, and is never sent anywhere. *A 320 × 200 JPEG was cropped and flagged as under 1080 px, and the page made no non-GET request. A text file was refused.*
- [x] No text or mark overlaps the cover, and the story stays inside its safe area. *Held by `tests/release-kit.test.ts`, and checked by eye on three exports.*
- [x] `/kit` is `noindex`, unlinked, and absent from `/`'s files.
- [x] `npm run ci` passes.
