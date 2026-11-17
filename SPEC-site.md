# Spec: site

Module of the [Déjà Gatsby rebuild](SPEC.md). Depends on `design-system` for every component, `audio-engine` for playback, and `media-pipeline` for the catalogue and the files on `media.thesamegatsby.com`.

**Written 17 Nov 2026, and handed to its own session to build.** Reno asked for the spec and everything needed, then implementation in a new session, so he can test the whole site in dev. The decisions it makes beyond the approved specs and canvas are marked **(new)**, and are listed together at the end for Reno to accept or change after testing.

## Objective

The homepage: a fan on a phone lands, taps a track, hears its 30 s snippet, and taps through to stream it. It puts together what the earlier modules built:
- `SiteHeader`, `ReleaseHero`, `ReleaseFilter` with `ReleaseRow`s, `NowPlayingBar` and the footer, as `Main.dc.html` and `HomeDesktop.dc.html` lay them out, and as `/system`'s sticky stack already does with fixtures
- the real catalogue from `src/catalogue`, mapped onto the components' view types
- `audio-engine` driving every play control, with the preconnect, intent and warm-up from its spec
- the page's metadata, a share image and the icons

## What exists today (checked 17 Nov 2026)

| | |
|---|---|
| `/` | A placeholder listing the five release titles from the catalogue (MP-11) |
| Components | All built and checked on `/system` (DS-25). They take view props, never the catalogue or the engine |
| `/system`'s `StickyStack` | The whole page put together with fixtures and a timer standing in for the engine. It's the layout reference |
| Engine | `src/audio/`, with `rowState()` and `barState()` mapping its state onto the components' props (AE-5) |
| `/bench` | The engine on plain buttons, for measuring. Open question 5 of the engine spec says `site` deletes it |
| `public/` | `favicon.ico`, `background.webp` and `profile_pic.jpg` from the old site (3.8 MB with the favicon), and `_headers` |
| Images | `next.config.ts` sets `images: { unoptimized: true }`, so every `next/image` renders its `src` as given, with no `srcset` |

## How the page is built

### Layout

- **A phone (below 768 px) follows `Main.dc.html`:** the floating header, the hero at 20 px from the screen's edges, the discography 36 px under it, and the footer 40 px under that. The values are `/system`'s sticky-stack frame's.
- **From 768 px it follows `HomeDesktop.dc.html`:** a 1200 px column with `clamp(20px, 4vw, 40px)` side padding, so the content is 1120 px wide. The discography sits 64 px under the hero, and the footer 72 px under the discography, with a hairline over it.
- **Footer, as both boards draw it:**
  - On a phone: `SocialLinks` (footer variant, "Follow the signal"), then "Made in South Africa" with the sparkle, the contact email, and "© {year} DÉJÀ GATSBY · REC" as a readout.
  - From 768 px: the wordmark (size l), "Made in South Africa" and the email on the left, and the © readout on the right. The header already carries the socials with their handles.
- **The page reserves the bar's height while it's up**, as `NowPlayingBar` does, so the footer never sits under it.

### Data

`src/app/home/releases.ts` maps the catalogue onto `design-system`'s types in a server component:
- each release's `cover` becomes the URL of its 1080 px WebP on the media domain, which the image loader swaps for each box's width. (Built as the 1080, not the 768 first written here: the hero asks for 768, and `next/image` warns in dev when a loader hands back the `src` unchanged.)
- each track's `duration` is its snippet's, and its `kind` carries over
- the links carry over as they are. A platform with no link isn't shown, as `StreamLinks` already does
- **the hero is the release marked `featured`, or else the newest** (SPEC.md)
- the socials are Instagram and TikTok, both @thesamegatsby, as the fixtures have them

The client gets plain view data plus `EngineTrack`s from `tracksFrom()`. It never imports `src/catalogue/index.ts`.

### Covers **(new)**

`next.config.ts` swaps `unoptimized` for a custom image loader (`src/app/image-loader.ts`), which static export allows. For a cover on the media domain it picks the smallest built width at or above the one asked for (192, 384, 768 or 1080, WebP). Anything else (`/system`'s local fixtures) passes through with a `?w=` the server ignores. `next/image` then writes a 1x/2x `srcset` from each component's `width`:
- a 60 px row cover loads the 192 px file, not the 768
- the hero's 480 px cover loads the 768 at 1x and the 1080 at 2x

AVIF isn't used. WebP is within about 10% of it at these sizes (media-pipeline's open question 2), and `next/image` writes one format.

### Playback

- **One engine for the page**, made in the client component with `tracksFrom()`'s tracks and the browser defaults (Media Session included).
- **Every play control calls the engine:** the hero's main button and tracklist, a single's row, an open EP's tracks, and the bar's Stop, Replay and Close. `rowState()` and `barState()` give the props.
- **Intent on touch (new):** `ReleaseRow` and `ReleaseHero` gain an optional `onIntent(trackId)`, raised on `pointerdown` and on focus of a play control. `TrackRow` and `Button` gain an optional `onIntent()` with no argument, like their `onToggle` and `onClick`, since they don't know a track id; the hero's main button is a `Button`. The engine spec listed changing a component's props as ask-first. This change only adds an optional callback, so the components stay presentational and `/system` is unchanged.
- **The preconnect** goes in the page's head with no `crossorigin`, as on `/bench`.
- **The warm-up** fetches the hero's lead track's first range once the page has loaded and gone idle.
- **Following an external link stops the snippet** (the engine's open question 6). A capture-phase click listener on the page calls `stop()` for any link that opens in a new tab: the stream links, the "More" platforms and the socials. No component changes for it.

### Metadata, share image and icons

- **Metadata:**
  - The title is "Déjà Gatsby".
  - **(new)** The description reads "Hear 30 seconds of every Déjà Gatsby track, then stream it in full."
  - `metadataBase` and the canonical URL are `https://www.thesamegatsby.com` (SPEC.md: the canonical host stays `www`).
  - Open Graph `website`, and a `summary_large_image` card.
  - `theme-color` is `--dg-bg`.
- **Share image (new):** `src/app/opengraph-image.tsx` renders 1200 × 630 at build time through `next/og`: the wordmark from `assets/wordmark.svg` and the sparkle, on the night-sky ground. It uses no web fonts, because `next/og` can't read WOFF2. Colours are read from `tokens.css` at build, so no hex enters the TSX.
- **Icons:**
  - `src/app/icon.svg` is the sparkle star.
  - **(new)** `src/app/apple-icon.tsx` renders the star on the ground at 180 px.
  - The old site's `favicon.ico` goes.
- **Serving them:** `next/og` writes the share image and the apple icon into `out/` with no file extension, so `public/_headers` gives both `Content-Type: image/png` (found in SITE-4: without it, Static Assets sent no type under `nosniff`).

### Clean-up

- Delete `/bench`. AE-8 measures on the homepage instead, by timing the element's `playing` event from the tap with a script the DevTools MCP injects. No measuring code ships.
- Delete `public/background.webp` and `public/profile_pic.jpg` (SPEC-media-pipeline.md left them to `site`). Nothing on the new site uses them.

## Code style

SPEC.md's rules apply. On top of them:
- Testable logic (the catalogue mapping, the image loader, reading a token's value) is `.ts` with tests, and the page components stay thin.
- Components come from their own files, never `src/design-system/index.ts`, as `/system` does. The barrel put `/system`'s CSS in the chunk `/` loads.

## Testing strategy

| Level | What | How |
|---|---|---|
| Unit | The catalogue mapping (covers, durations, the hero pick, links), the image loader's width choice and passthrough, reading tokens from `tokens.css` | `npm test` |
| Build | `next build` exports `/`, the share image and the icons, and `/` has no `/system` code or engine measuring code | `npm run ci`, then grepping `out/` |
| Browser | `npm run dev` in the browser pane at 360, 768 and 1280 px: every release, filter, EP open and close, play, Stop, Replay, Close, fast tapping, a stream link stopping the snippet, keyboard only, reduced motion, no console errors. Audio is muted by a script before any tap, so nothing plays aloud on Reno's Mac | Browser pane |
| Performance | First load under 350 KB before anything plays, and Lighthouse mobile performance 90 or more, against the built site served by `wrangler dev` | Chrome DevTools MCP |

## Boundaries

**Always**
- Keep `/` free of `/system`'s code and of anything measuring.
- Report the first-load size and the Lighthouse score whenever the homepage changes (SPEC.md).

**Ask first**
- Anything the canvas doesn't draw beyond the **(new)** items below.
- Pushing, which runs a Workers build.

**Never**
- Draw anything over cover art (SPEC.md).
- Autoplay, or play audio aloud on Reno's Mac while testing.
- Ship the catalogue's validation to the browser.

## Success criteria

- [ ] `/` shows the five releases newest first, with Welcome to Vapor_City in the hero, and the filter offering only the types the catalogue has.
- [ ] Every play control plays its snippet through the engine. Stop, Replay and Close work, the bar stays up after the end, and following a stream link stops the snippet.
- [ ] Each cover loads at the smallest built width that fills its box.
- [ ] Checked at 360, 768 and 1280 px, by keyboard only, and with reduced motion, with no console errors.
- [ ] First load under 350 KB, and Lighthouse mobile performance 90 or more.
- [ ] `out/` has the share image, the icons and the metadata, and no `/bench`, `background.webp` or `profile_pic.jpg`.
- [ ] `npm run ci` passes.

## Out of scope

- The launch (CF-5), which waits on the Aero licence and Amazon Music's own mark.
- The missing platform links, which Reno sends later. Their buttons appear when the links land in `songs.json`.
- `release-kit` and `claude-design-system`.

## Decisions made without review (new)

Reno asked for the spec and the build without a review stop, so these were decided as part of it. Each can change after he tests:

1. **Covers through a custom image loader**, WebP at the smallest built width that fills each box.
2. **`onIntent` added to `TrackRow`, `ReleaseRow`, `ReleaseHero` and `Button`:** an optional callback, so no visual or behaviour change on `/system`. `Button` was added while building, for the hero's main button.
3. **The description line** for search and share cards.
4. **The share image:** the wordmark and the sparkle on the ground, with no other text.
5. **The apple-touch icon:** the sparkle on the ground.
6. **`/bench` deleted now**, with AE-8 measuring on the homepage.
