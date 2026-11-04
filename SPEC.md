# Spec: Déjà Gatsby rebuild

This is the index for the rebuild. It holds the confirmed intent, the approved capability map, and the stack, structure, style, testing and boundaries every module shares. Each module has its own `SPEC-<module>.md`, written when that module comes up in the build order.

## Objective

Confirmed with Reno on 3 Nov 2026.

| | |
|---|---|
| **Outcome** | A **Déjà Gatsby** brand system, and a rebuilt listen-then-stream site that uses it |
| **User** | A fan landing on a phone from Instagram or TikTok. Also Reno, making release artwork |
| **Why now** | The site is dated (Next 13, ~21 MB of images, a player that downloads the whole file before making a sound), the catalogue is growing, and Reno's other projects already run on Cloudflare |
| **Success** | Play feels instant anywhere, the page is light, adding a song is one command, and Claude makes on-brand covers and posts with no style briefing |
| **Constraint** | Free tiers, solo maintenance, no server code: static site plus R2 |
| **Out of scope** | Bookings, press kit or bio; a CMS or upload page; autoplay, queues or full-track playback; analytics; accounts, mailing list or merch; Figma or PSD templates; the standalone claude.ai/design app |

The site's one job: a visitor taps a track, hears a 30-second snippet, and clicks through to stream the full song. Each snippet plays once and stops. The now-playing bar keeps the stream button in view, and stays up after the snippet ends because that is the moment to convert.

### Success criteria

- **Tap to first sound under 300 ms** on Chrome DevTools' "Fast 4G" + 4× CPU throttle, with the snippet served from Cloudflare's edge cache.
- **First load under 350 KB transferred** before anything plays, and a Lighthouse mobile performance score of 90 or more.
- **`npm run add-song`** turns a master and a cover into a snippet, cover sizes, an R2 upload and a catalogue entry. All that's left by hand is committing and deploying.
- **The release kit** exports a post (1080 × 1350) and a story (1080 × 1920) as PNGs at exactly those sizes.
- **Claude makes an on-brand post** from the Déjà Gatsby Design System when given only the track title and the cover.

### Confirmed assumptions

1. Snippets are 30 s, cut from a start second chosen per song, with short fades. The current files are 15–18 s, so all six get re-cut from the masters.
2. One dark theme, lifted by the bright accents from the moodboard. No light/dark toggle.
3. Next.js upgraded and exported as static files. Tokens are plain CSS custom properties. Chakra UI, Emotion, Framer Motion, Howler and react-icons are removed.
4. Cloudflare serves the site and an R2 bucket at `media.thesamegatsby.com`. DNS moves off Vercel. Vercel stays live until the Cloudflare version is checked.
5. Fonts: Aero (display), Chakra Petch (UI), VT323 (readouts). Reno confirms that Aero's licence covers web use.
6. The release kit lives at an unlinked route, and the homepage never loads its code.

### Decisions made since confirmation

| Decision | Why |
|---|---|
| **Workers Static Assets rather than Cloudflare Pages** for the site | Cloudflare now recommends Workers for every new project. Static-asset requests are free and unlimited, and Workers covers everything Pages does. teaming-adventures stays on Pages: there's no reason to move a working deployment. |
| **Fades are baked into each snippet file at encode time** | This replaces the Web Audio fade from assumption 3. iPhones ignore `volume` on media elements, and a fade inside the file needs no runtime code at all. A plain `<audio>` element then starts faster, and sound doesn't depend on CORS. |
| **CORS is still set up on the media domain** | The release kit draws covers onto a canvas to export PNGs. Cross-origin images taint a canvas unless the response carries `Access-Control-Allow-Origin`. A future visualiser built on Web Audio would need it too. |
| **The Design System is published as a Claude "Design System" artifact** | The standalone claude.ai/design app closes on 14 Dec 2026. The Design System artifact type lives in Claude and is what Claude's Design canvas builds on. |
| **The canonical host stays `www.thesamegatsby.com`** | Today the apex 308-redirects to `www`. Keeping that preserves every link that's already been shared. |
| **npm is the package manager** | The repo has both `package-lock.json` and `yarn.lock`. The scaffold removes `yarn.lock`, matching teaming-adventures. |
| **Eight platforms.** Five main ones with equal weight (Spotify, Apple Music, YouTube Music, SoundCloud, Bandcamp), plus Amazon Music, Deezer and Tidal behind "More" | Reno's call, with Bandcamp on every release. There's no single primary button. Five fit a 360 px now-playing bar at about 62 px each, and eight wouldn't, so the last three sit one tap away. The six existing songs need their per-release Bandcamp, Amazon Music, Deezer and Tidal links collected when `media-pipeline` rebuilds the catalogue. The mockups link to the Bandcamp artist page for now. |
| **Socials are Instagram and TikTok only** | Reno's call. SoundCloud and Bandcamp are where people listen and buy, so they sit with each release instead. They sit in the header row, to the right of the wordmark, with no "Follow" label: icons only on a phone, and each icon with its @thesamegatsby handle on desktop. Phones also get the footer "Follow the signal" block. |
| **Snippets stay AAC in `.m4a`, cut from the WAV masters** | AAC is the best quality per byte that plays in every browser. The current files have their index (`moov` box) at the *end*: all six were muxed by ffmpeg without `+faststart`. A streaming player then has to fetch the end of the file before it can start. `media-pipeline` puts the index first. Its spec settles the bitrate and encoder: 160 kbps from Apple's AAC encoder, which beats ffmpeg's built-in one (decided 4 Nov 2026). |
| **Push to deploy through Workers Builds** | Reno's call. `main` deploys to production. Every other branch gets a preview URL. The build runs lint, typecheck and tests before building, so a failing check never deploys. CI needs no secrets, because R2 uploads happen locally in `add-song`. |
| **The catalogue holds releases, not just tracks.** Each release is a single, EP or album holding one or more tracks, and each track has a kind: original, remix or edit | Reno wants EPs, albums, remixes and edits grouped. Remixes and edits are a kind of *track*, not a release type, since a remix can come out as a single or sit on an EP. `media-pipeline`'s catalogue schema and `add-song` follow this shape. Which layout the site uses is open question 2. |
| **No filter or text over cover art** | Reno's call after the first screens. The art stays clean. |
| **A drifting grid backdrop, even across the page** | Reno picked the grid over the drifting glows, and asked that it not fade out in places. It's still under reduced motion. |
| **Discography: filter chips + expandable releases** (option A) | Reno's pick of the three options. It's one list, newest first, filtered by type (All · Singles · EPs · Albums · Remixes & edits): a "Show" dropdown on a phone, and a row of buttons on desktop (Reno's call). A single plays when tapped. An EP or album expands in place to show its tracks. A type only appears in the dropdown when at least one release matches it. |
| **All Aero display type uses V5 "stacked tape"**: the wordmark and every release title | Reno found the chrome and colour-split version too bright and glossy, picked V5 from the variations, then asked for hero titles to match: bone-white Aero with two hard shadows, ultramarine then hazard at 55% (`0.03em 0.04em 0 #2B3BFF, 0.06em 0.08em 0 rgba(255,75,31,0.55)`). On artwork it becomes white with a black drop, the way the covers set it. |
| **Sticky header in its own box** | Reno asked for the header to sit in front of the background while scrolling. It's a floating glass box (translucent night-sky colour with a backdrop blur, hairline border, soft shadow), inset from the edges. A full-width bar version is kept as a fallback. |
| **The filter and the open EP/album stay sticky in the discography** | Reno's call. The filter (dropdown on a phone, buttons on desktop) sticks under the header in its own contained box. An expanded EP or album's row sticks under it until its last track has scrolled past, then hands over to the next expanded release, like section headers in a music app. |
| **No channel readout in the header** | Reno asked for the top-right "CH 06 · SP" readout to go, on phone and desktop. VCR readouts stay in the player and on track rows. |
| **The hero adapts to the release type** | A single gets "Play snippet". An EP or album gets "Play lead track" plus its tracklist, each track playable, and "Stream the EP / album" links. An album shows its first five tracks and a "Show all" button. This means every release in the catalogue needs a `leadTrack`, and the hero shows the newest release unless another is marked `featured`. |
| **No DNS inventory from Reno** | Checked publicly on 3 Nov 2026: no DNSSEC, no mail, and only Vercel's default records. Details are in SPEC-cloudflare-infra.md. |

## Capability map

Approved 3 Nov 2026. The module ids are stable and are never renamed.

| Module id | Responsibility | Depends on | Spec |
|---|---|---|---|
| `design-system` | Tokens as CSS custom properties, self-hosted fonts, textures, the sparkle star and icons, presentational React components, the `/system` preview route | — | [SPEC-design-system.md](SPEC-design-system.md) |
| `cloudflare-infra` | Cloudflare zone and DNS migration, the static-assets Worker, the R2 bucket at `media.thesamegatsby.com` with edge caching and CORS, cutover and rollback | — | [SPEC-cloudflare-infra.md](SPEC-cloudflare-infra.md) |
| `media-pipeline` | `npm run add-song`: cut and encode the snippet, size the covers, content-hash the names, upload to R2, write the typed catalogue entry. Re-cut the six existing songs | `cloudflare-infra` | [SPEC-media-pipeline.md](SPEC-media-pipeline.md) |
| `audio-engine` | Player core: one shared `<audio>` element, fast start, preload on intent, one snippet at a time, stop at end, Media Session for the lock screen. No UI | `media-pipeline` | written when reached |
| `site` | The homepage built from `design-system` components and wired to `audio-engine`, plus metadata, Open Graph image and favicon | `design-system`, `audio-engine`, `media-pipeline` | written when reached |
| `release-kit` | Unlinked `/kit` route: upload a cover, pick a track, export the post and story PNGs | `design-system`, `media-pipeline` | written when reached |
| `claude-design-system` | Publish Déjà Gatsby as a Design System artifact in Claude, built from the same tokens and assets | `design-system` | written when reached |

**Build order:**
1. `design-system` and `cloudflare-infra`, in parallel
2. `media-pipeline`
3. `audio-engine`
4. `site`
5. `release-kit` and `claude-design-system`

`release-kit` and `claude-design-system` come last on purpose. Tokens tend to move while the real page is being built, so publishing to Claude after the site settles avoids republishing straight away.

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router), React 19, TypeScript 5. `output: 'export'`, so the build is static files in `out/` with no server, API routes, middleware or ISR. Versions are matched to teaming-adventures' pins at scaffold time. |
| Styling | Global `tokens.css` + `textures.css`, and CSS Modules per component. No runtime CSS-in-JS and no Tailwind. |
| Fonts | `next/font/local` over WOFF2 files in `src/design-system/fonts/` |
| Audio | A native `<audio>` element (owned by `audio-engine`) |
| Hosting | Cloudflare Workers Static Assets for the site. R2 behind `media.thesamegatsby.com` for snippets and covers |
| Tooling | Wrangler as a dev dependency. `media-pipeline` uses macOS's own `afconvert` (Apple's AAC encoder) and `sips`, plus `cwebp` from Homebrew, so ffmpeg isn't needed (SPEC-media-pipeline.md, open question 6) |
| CI/CD | Workers Builds, connected to `github.com/littlevegasdavids/thesamegatsby`. Build: `npm run ci`. Production branch `main`: `npx wrangler deploy`. Other branches: `npx wrangler versions upload` (preview URL) |
| Tests | Node's built-in runner (`node --test`) with native TypeScript type-stripping (Node 24 is installed), the same as teaming-adventures |

## Commands

These are the commands the scaffold sets up. Until then, the old `next dev` / `next build` scripts apply.

```bash
npm run dev          # Next dev server, :3000
npm run build        # static export to out/
npm run cf:dev       # build, then serve out/ through wrangler dev as the Worker would (:8787)
npm run lint         # eslint
npm run typecheck    # tsc --noEmit
npm test             # node --test "tests/**/*.test.ts"
npm run ci           # lint, typecheck, test, then build. What Workers Builds runs on every push
npm run add-song     # media-pipeline; flags defined in SPEC-media-pipeline.md
```

Once `cloudflare-infra` is done, every push deploys through Workers Builds. There is no manual deploy script.

## Project structure

```
src/
  app/
    layout.tsx            → root layout: fonts, tokens, texture overlays
    page.tsx              → homepage (site)
    system/page.tsx       → design-system preview; unlinked, noindex
    kit/page.tsx          → release kit; unlinked, noindex
  design-system/
    tokens.css            → every colour, type, space, radius and motion value. The master copy
    textures.css          → grain, scanline, halftone, tape, glass, glow, sticker, vignette and backdrop utilities
    fonts/                → WOFF2 files plus each font's licence file
    fonts.ts              → next/font/local declarations
    assets/               → sparkle star, wordmark, grain tile, platform and social icons
    components/<Name>/    → <Name>.tsx + <Name>.module.css
    index.ts              → public exports
  audio/                  → audio-engine
  catalogue/              → songs.json, its types and validation (media-pipeline output)
scripts/                  → add-song and other one-off tooling
tests/                    → *.test.ts for node --test
public/                   → favicon, Open Graph image, _headers (copied into out/)
wrangler.jsonc            → static-assets Worker config
```

Masters (WAV) never go in the repo. `add-song` reads them from a path you pass it.

## Code style

```tsx
// src/design-system/components/VhsReadout/VhsReadout.tsx
import { formatTime } from "../../format";
import styles from "./VhsReadout.module.css";

type Mode = "play" | "stop" | "load";

const GLYPH: Record<Mode, string> = { play: "▶", stop: "■", load: "◌" };

export function VhsReadout({ mode, elapsed, duration }: { mode: Mode; elapsed: number; duration: number }) {
  return (
    <p className={styles.readout}>
      <span aria-hidden="true">{GLYPH[mode]}</span> {mode.toUpperCase()} {formatTime(elapsed)} / {formatTime(duration)}
    </p>
  );
}
```

```css
/* VhsReadout.module.css */
.readout {
  font-family: var(--dg-font-readout);
  font-size: var(--dg-text-readout);
  color: var(--dg-accent);
  text-shadow: var(--dg-glow-accent);
}
```

- Components are named exports in PascalCase, one folder each. Props are typed inline unless they're shared.
- Components are server components by default. Add `"use client"` only where there's state or event handling.
- Tokens use the `--dg-` prefix in kebab-case. **No colour, font or raw spacing value appears outside `tokens.css`**, and a test enforces this.
- Inline `style` is allowed only for setting a custom property to a runtime value, for example `style={{ "--progress": ratio }}`.
- Comments explain why something is done, never what the code does.
- Commits use conventional-commit style (`feat(design-system): …`), one per self-contained unit. The body explains why.

## Testing strategy

| Level | What | How |
|---|---|---|
| Unit | Token contrast pairs, no stray hex values outside `tokens.css`, time formatting, catalogue schema | `npm test` |
| Static | Types and lint | `npm run typecheck`, `npm run lint` |
| Visual / manual | Every component in every state at 360, 768 and 1280 px. Keyboard-only pass. Reduced motion | The built-in browser on `/system`, served by `npm run cf:dev` |
| Performance | The success-criteria numbers | Lighthouse and network throttling through Chrome DevTools against `npm run cf:dev`, then against the deployed preview |
| Edge | Cache hits, range requests, CORS, redirects | `curl` checks listed in `SPEC-cloudflare-infra.md` |

There's no browser e2e framework for now. Adding one (Playwright) is an ask-first decision.

## Boundaries

**Always**
- Work on the `redesign` branch. `main` keeps serving production on Vercel until cutover.
- Run `npm run typecheck`, `npm run lint` and `npm test` before every commit.
- Report first-load size and the Lighthouse score whenever a change touches the homepage.
- Respect `prefers-reduced-motion`. Keep touch targets at 44 px or more. Keep every text pair at WCAG AA or better.
- Keep one copy of each token, in `tokens.css`.

**Ask first**
- Adding any dependency, or installing tools (ffmpeg, fonttools).
- Downloading font files, icon sets or other third-party assets.
- Anything in the Cloudflare, Vercel, Host Africa or GitHub dashboards or APIs: DNS, nameservers, buckets, rules, tokens, Worker settings.
- Uploading media to R2, and publishing anything to Claude artifacts.
- Changing the capability map, or a confirmed assumption.
- Pushing to GitHub, which triggers Vercel and Workers builds.

**Never**
- Commit secrets, `.env`, `.dev.vars` or masters.
- Serve production media from `r2.dev`.
- Change nameservers before every existing DNS record has been inventoried and recreated.
- Delete the Vercel project within 14 days of cutover.
- Set Aero below 24 px or use it for body text.
- Launch publicly in Aero before its licence is confirmed.

## Open questions

1. **Aero's licence: Reno will pay (decided 3 Nov 2026, not yet paid).** dafont lists Aero (by Nirmal Biswas, Picatype Design Studio) as *Donationware*. The author's note reads: "Usage demands USD 25 or more via PayPal to nirmalbiswas@gmail.com". The page says nothing about web embedding or commercial use. Before public launch, Reno will:
   - pay the USD 25
   - email the author to confirm the payment covers a self-hosted web font plus cover art and social posts for a musician
   - save the reply as `src/design-system/fonts/aero-licence.md`

   Building can go ahead in the meantime.

Questions specific to each module live in that module's spec.
