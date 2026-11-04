# Tasks: design-system + cloudflare-infra

Plan: [plan.md](plan.md). Specs: [SPEC.md](../SPEC.md), [SPEC-design-system.md](../SPEC-design-system.md), [SPEC-cloudflare-infra.md](../SPEC-cloudflare-infra.md). Visual reference: the approved canvas ["Déjà Gatsby Screens"](https://claude.ai/artifact/WSB4B7NtCYipXV3GSXmmSo).

**Every task, before it's ticked:**
- its acceptance criteria are met
- `npm run ci` passes (from DS-2 on)
- it has been checked at runtime, not just compiled
- there's no dead code or debug output
- it's one commit on `redesign`

**Every UI task (DS-5 on) also:**
- is checked on `/system` at 360, 768 and 1280 px, by keyboard, and with reduced motion on
- is compared side by side with the canvas boards on its **Canvas** line, at each board's own width (390 px for phone, 1440 px for desktop). Drift is fixed, or listed for the next checkpoint. Where the canvas and the spec disagree, the spec wins. The known cases are in plan.md

**Every component task also** adds its export to `src/design-system/index.ts` and its section to `src/app/system/page.tsx`. Those one-line edits aren't repeated in the file lists.

🔒 means I ask before doing it. 👤 means Reno does it.

---

## Phase 0: Screens for approval

- [x] **DS-0: Mock up the redesign** on the design canvas ["Déjà Gatsby Screens"](https://claude.ai/artifact/WSB4B7NtCYipXV3GSXmmSo)
  - 19 boards. The ones that serve as references are listed in plan.md:
    - the clickable phone home and the full-length phone page
    - the desktop home
    - the sticky and filter-open phone states
    - the EP and album heroes on phone and desktop
    - the playing, ended and "More" states
    - the style tile and the wordmark variations

    The rest are options Reno didn't pick.
  - Real covers (downsized), real titles, and real stream links for Spotify, Apple Music, YouTube Music and SoundCloud. Bandcamp links to the artist page.
  - **Placeholders:**
    - The platform and social icons are hand-drawn stand-ins until DS-15.
    - The Amazon Music, Deezer and Tidal links are `#`.
    - Entries in [brackets] stand in for an album, a remix and an edit.

### Checkpoint 0: Reno approves the screens

Review round 1 (3 Nov 2026):
- [x] Animated background: the grid was chosen and now has even strength down the page
- [x] No filter or text over cover art, on the hero (phone and desktop)
- [x] Releases grouped with option A (filter chips + expandable EPs and albums), built into the clickable phone screen and the desktop page
- [x] Player bar: no change wanted
- [x] Wordmark: V5 "stacked tape" picked and applied to every screen and the style tile

Review round 2 (3 Nov 2026):
- [x] Grid background approved
- [x] Hero for a new EP or album designed on phone and desktop
- [x] Reno reviews the V5 wordmark in place
- [x] Reno reviews the EP and album heroes
- [x] Hero titles switched to V5, matching the wordmark (also the EP sheet title and the style tile)

Review round 3 (3 Nov 2026):
- [x] Top-right channel readout removed from every phone and desktop header (a comment on the canvas)
- [x] Three options for socials on a phone designed
- [x] Socials: Instagram and TikTok only, in the header row beside the wordmark with no "Follow" label. Icons only on a phone, icon + @thesamegatsby on desktop. The phone footer also dropped SoundCloud and Bandcamp
- [x] Filter sticky under the header, and an expanded EP/album row sticky under it until its last track passes. Done on phone and desktop, with a mid-scroll phone board showing it
- [x] Filter box contained like the header (inset, glass, border, radius), after a comment that it bled into the screen edges
- [x] Filter is a "Show" dropdown on a phone (clickable, plus an "open" board) and stays as buttons on desktop
- [x] Header made sticky, in its own floating glass box, on phone and desktop. A full-width bar version is in the clickable phone board's Tweaks
- [x] Bandcamp added to every release's stream links (hero, now-playing bar, desktop), linking to the artist page until the per-release URLs are collected

- [x] **Screens approved by Reno on 3 Nov 2026**
- [x] Every change from review is in SPEC.md's decisions and SPEC-design-system.md (checked item by item on 3 Nov 2026)

### Before DS-1

- [x] Reno approved the G1–G7 recommendations in plan.md with the plan (3 Nov 2026). They're folded into SPEC-design-system.md, along with the canvas values the token tables didn't list (shadows, glows, glass blur, grid strength, sticky-stack heights and insets, scanline and vignette). Contrast values for the new translucent surfaces were computed and added to the contrast table.

---

## Phase 1: Foundation

- [x] **DS-1: Upgrade to Next.js 16 with the App Router, exported as static files** 🔒 *(branch, dependencies)*
  - Replace Next 13 / React 18 / Chakra with Next 16 / React 19 / TypeScript 5. Versions match teaming-adventures' pins. Set `output: 'export'` and `images: { unoptimized: true }`. `/` becomes a plain placeholder listing the six titles from `songs/index.ts`.
  - **Acceptance:**
    - `npm run build` writes `out/index.html` containing all six titles
    - `@chakra-ui/*`, `@emotion/*`, `framer-motion`, `react-icons` and `yarn.lock` are gone, along with `pages/`, `components/`, `styles/` and `next.config.js`
    - nothing needs a server: every route builds as static (○), the middleware and functions manifests are empty, and there's no `.next/standalone`. (`.next/server/` is still written, because every export build prerenders through it.)
  - **Verify:** `npm run build`. `npm run dev`, then load `/` in the built-in browser with no console errors.
  - **Done 3 Nov 2026.** `.eslintrc.json` and the `lint` and `start` scripts were removed too, because `next lint` is gone in Next 16 and `next start` can't serve an export. DS-2 adds the flat config and `lint`.
  - **Depends on:** none
  - **Files:** `package.json`, `package-lock.json`, `next.config.ts`, `tsconfig.json`, `src/app/layout.tsx`, `src/app/page.tsx` (plus deletions)
  - **Size:** M

- [x] **DS-2: Check scripts and repo hygiene**
  - Add `lint` (ESLint 9 flat config), `typecheck`, `test` (`node --test`) and `ci` (all three, then build). Add `.node-version` (`24`). Add `.env`, `.env.*`, `.dev.vars*` and `.wrangler/` to `.gitignore`. First real code: `formatTime` with its test.
  - **Acceptance:**
    - `npm run ci` passes
    - `formatTime` gives `00:00` for 0, `00:12` for 12.4, `00:30` for 30, and `--:--` for NaN or negative input
    - `git check-ignore .env .dev.vars` matches both
  - **Verify:** `npm run ci`. Confirm the test fails if `formatTime` is broken on purpose.
  - **Depends on:** DS-1
  - **Files:** `package.json`, `eslint.config.mjs`, `.node-version`, `.gitignore`, `src/design-system/format.ts`, `tests/format.test.ts`
  - **Size:** S

- [x] **DS-3: Project `CLAUDE.md`**
  - A lean working agreement. It covers:
    - what the site is
    - where the specs and the plan live
    - the canvas link as the visual reference, and the rule that the spec wins where they disagree
    - the stack and the commands
    - the boundaries that matter most: the branch, ask-first, no secrets, the Aero rules

    It points at the SPEC files rather than repeating them.
  - **Acceptance:** under about 60 lines, with nothing the repo already records.
  - **Verify:** read it against SPEC.md for contradictions.
  - **Depends on:** DS-2
  - **Files:** `CLAUDE.md`
  - **Size:** XS

### Checkpoint 1
- [x] `npm run ci` passes on a clean checkout
- [x] The placeholder `/` renders in dev
- [x] DS-1 to DS-3 are committed on `redesign` (not pushed)

---

## Phase 2: The look

- [x] **DS-4: Tokens, with contrast and no-stray-values tests**
  - `tokens.css` holds every token in SPEC-design-system.md: primitive, semantic, type (as settled by G1), space, radius, motion, layers, and the canvas values folded in before DS-1. Phone values come first, redefined from 768 px in the same file (the header height, inset and sticky offsets differ). It's imported once in the root layout. `contrast.ts` parses colours and computes WCAG ratios, compositing translucent tokens such as the glass over `--dg-bg` first.
  - Two tests:
    - one checks every pair in the spec's contrast table, plus fg and fg-muted on the glass surface
    - the other fails on a hex, `rgb()` or font-family name anywhere under `src/` outside `tokens.css` and `textures.css`
  - **Acceptance:**
    - both tests pass
    - changing `--dg-fg-subtle` to `#5A5650` makes the contrast test fail
    - adding `color: #fff` to any component CSS makes the stray-values test fail
  - **Verify:** `npm test`. Break each rule once on purpose and confirm the failure.
  - **Done 3 Nov 2026.** Some choices the spec doesn't make:
    - **Layer values.** The spec gives the layer tokens no values. They're 100 (bar), 200 (overlay) and 300 (texture), so the grain sits over the bar, as it does on the canvas. DS-7 settles the stacking.
    - **What the backdrop tokens hold.** `--dg-scanline` and `--dg-vignette` hold whole gradients. `--dg-grid-line` and `--dg-grid-glow` are colours only, so DS-8 draws the radial's shape.
    - **The vignette is centred**, as the spec reads. The canvas centres it at 50% 35%.
    - **Extra colour functions.** The stray-values test also catches `hsl()`, `hwb()`, `lab()`, `lch()`, `oklab()` and `oklch()`.
  - **Depends on:** DS-2, and G1 answered
  - **Files:** `src/design-system/tokens.css`, `src/design-system/contrast.ts`, `src/app/layout.tsx`, `tests/tokens.test.ts`, `tests/no-raw-values.test.ts`
  - **Size:** M

- [x] **DS-5: Fonts** 🔒 *(fonttools venv, font downloads)*
  - Subset Aero (from `~/Downloads/Aero.ttf`) to Latin-1 and convert it to WOFF2. Fetch Chakra Petch 400/600 and VT323 from `google/fonts` and subset them the same way. Check VT323 for `▶■◌`. Declare all four with `next/font/local`, preloading only Aero and Chakra Petch 400. Commit the OFL texts. Keep the venv for DS-10.
  - **Acceptance:**
    - the four WOFF2 files total 90 KB or less
    - `font-display: swap` throughout
    - exactly two font preloads in `out/index.html`
    - "Déjà Gatsby" renders in Aero with correct accents
    - the glyph check result is recorded in SPEC-design-system.md's open question 1
  - **Verify:**
    - `ls -l` for the file sizes
    - `npm run build`, then grep the preload links in `out/index.html`
    - **Canvas:** `StyleTile.dc.html` at 1440 px, type block. Aero, Chakra Petch and VT323 render with the same glyphs and accents as on the board (the canvas uses the same Aero file)
  - **Done 3 Nov 2026.** The four files total 43,260 bytes: Aero 11,240, Chakra Petch 400 7,760 and 600 7,988, VT323 16,272. `out/index.html` has the two preloads, and all four faces are `swap`. VT323 has no `▶■◌`, which is recorded in the spec. Some choices the spec doesn't make:
    - **Family names.** Under Turbopack, next/font points a font's class and variable at a family named after its constant, so `fonts.ts` relies on that. Chakra Petch 600 is its own declaration with `preload: false`, and joins the `chakraPetch` family through `declarations`. Without that split, both weights would be preloaded.
    - **`tokens.css` changed**, though it isn't in the file list. The font tokens read next/font's variables, which add its size-adjusted fallback face, and fall back to the plain family name outside Next.
    - **Hinting is kept**, and so are the licence name records (IDs 13 and 14) in the OFL binaries. Dropping Aero's hinting would take 5.7 KB off the preload path if that's ever wanted.
    - **The venv** is at `~/.local/share/venvs/dejagatsby-fonttools` (Python 3.14.6, fonttools 4.68.0, brotli 1.2.1), outside the repo and the scratchpad, for DS-10.
    - **`/system` checks** wait for DS-6, which creates the route. Fonts have no keyboard or motion behaviour. The canvas check was done at 1440 px against a rebuilt type block, with no drift, and every subset glyph matches its source's outline and advance.
  - **Depends on:** DS-4
  - **Files:** `src/design-system/fonts/*.woff2`, `src/design-system/fonts/OFL-*.txt`, `src/design-system/fonts.ts`, `src/design-system/tokens.css`, `src/app/layout.tsx`, `tests/fonts.test.ts`
  - **Size:** M

- [x] **DS-6: The `/system` route and its tokens section**
  - An unlinked, `noindex` route. It shows every colour swatch with its contrast value against `--dg-bg`, the type scale in each font, and space, radius and motion samples. The section reads the values from `tokens.css` at build time and computes ratios with `contrast.ts`, so no hex appears in its source.
  - **Acceptance:**
    - `/system` renders at 360, 768 and 1280 px with no horizontal scroll and no console errors
    - `/` contains no link to it
    - its JavaScript chunk isn't referenced by `out/index.html`
    - the stray-values test passes with the section in place
  - **Verify:**
    - the built-in browser at each width
    - `grep` the chunk names in `out/index.html`
    - **Canvas:** `StyleTile.dc.html` at 1440 px, colour and type blocks. Same swatches, names and ratios, and the same type samples at the sizes G1 settled
  - **Done 3 Nov 2026.** `/system` has `noindex`, nothing links to it, and its one extra asset is a CSS chunk that `out/index.html` doesn't reference. It's all server components, so there's no `/system` JS chunk at all. No horizontal scroll or console errors at 360, 768 and 1280 px, and the 768 px tokens switch as specified. Some choices the spec doesn't make:
    - **The section shows every colour, type, space, radius and motion token.** That's the 14 primitives (the tile's 12 plus white and black), the 20 semantic colours, and all 11 type looks at their token sizes. `tests/system-tokens.test.ts` fails if a token in `tokens.css` has no sample. `--dg-glass-filter` and the `--dg-grid-*` colours wait for DS-7 and DS-8, and the shadows and tape for the textures section.
    - **Every swatch shows its ratio on `--dg-bg`.** The tile's role words (Ground, Surface, Raised, Lines, Panels) go on their own line, under the ratio.
    - **`src/app/system/body.css`** gives the route a dark ground and no body margin. It's imported by `/system` only, because no global stylesheet exists before DS-7, and `tokens.css` only takes `:root`. DS-7 can delete it once `Screen` frames every page.
    - **Motion samples run from a checkbox**, using CSS `:has()` and no JS. Each dot slides at its duration on `--dg-ease-tape`, and under reduced motion they jump.
    - **Checks:** Tab reaches the toggle, which shows the 2 px `--dg-focus` ring and has a 44 px label. The reduced-motion rule was checked by applying its body directly. Real `prefers-reduced-motion` emulation wasn't available: the pane can't emulate it, and the DevTools MCP needs Google Chrome, which isn't installed.
    - **Canvas drift, for Checkpoint 2:**
      - Ultra light reads 7.5:1 against the tile's 7.6. The true value is 7.547, so the tile and the spec's contrast table ("link on bg 7.6") round it wrong. The other six text ratios match.
      - The type samples are at G1 sizes, not the tile's specimen sizes: the Aero sample is 72 px at 1440 px (48 on the tile), Give me that KaiZen is 15 px (18), and the readout is 22 px (28).
      - Swatch names are 14 px and captions 18 px (13 and 17 on the tile), per the spec's small-type floor.
      - The colour column is 632 px wide at 1440 px, against the tile's 540, with four swatches a row either way.
  - **Depends on:** DS-5
  - **Files:** `src/app/system/page.tsx`, `src/app/system/system.module.css`, `src/app/system/body.css`, `src/app/system/sections/TokensSection.tsx`, `src/app/system/sections/tokens.ts`, `tests/system-tokens.test.ts`
  - **Size:** S

### Checkpoint 2: `/system` matches the approved style tile
- [x] Screenshots of `/system` at 360 and 1440 px shared next to the style tile
- [x] Any drift from the mockup fixed or agreed. **Reno agreed all four DS-6 items on 3 Nov 2026:**
  - Ultra light reads 7.5:1. The spec's contrast table now says 7.5 too. The tile's copy is Reno's to update
  - the type samples stay at the G1 token sizes
  - the 14 and 18 px small-type floor
  - the 632 px colour column

---

## Phase 3: Edge path (alongside phases 4–8)

- [ ] **CF-1: Move the zone to Cloudflare as DNS only** 👤 🔒
  - Reno adds `thesamegatsby.com` to Cloudflare (Free plan). In the import, keep only the apex and `www`, still pointing at Vercel's IPs, DNS-only. Delete the wildcard, the CAA records and `_domainconnect`. Then Reno changes the nameservers at Host Africa.
  - **Acceptance:**
    - `dig +short NS thesamegatsby.com` returns Cloudflare's nameservers
    - `curl -sI https://www.thesamegatsby.com` still returns `200` with `server: Vercel`
    - the apex still 308s to `www`
    - `dig +short random-name.thesamegatsby.com` returns nothing
  - **Verify:** those four checks, run until the change has propagated. Record the result in SPEC-cloudflare-infra.md's Current state.
  - **Depends on:** none (can start immediately)
  - **Files:** `SPEC-cloudflare-infra.md`
  - **Size:** S (mostly waiting)

- [ ] **CF-2: Local Worker config and `cf:dev`** 🔒 *(wrangler dependency)*
  - Add `wrangler.jsonc` (assets only, `./out`, `404-page`), `public/_headers` (immutable `/_next/static/*`, `nosniff`, referrer policy), and the `cf:dev` script.
  - **Acceptance:**
    - `npm run cf:dev` serves `/` and `/system` on :8787
    - `/_next/static/*` responses carry `immutable`
    - an unknown path returns the 404 page
  - **Verify:** `curl -sI` against `localhost:8787` for each case.
  - **Depends on:** DS-2
  - **Files:** `package.json`, `wrangler.jsonc`, `public/_headers`
  - **Size:** S

- [ ] **CF-3: Media bucket, zone settings, rules and a probe object** 🔒 👤
  - Run `wrangler login`. Create the `thesamegatsby-media` bucket and connect `media.thesamegatsby.com`.
  - Set the zone to SSL/TLS Full (strict), Always Use HTTPS, and HSTS at Vercel's two years. SPEC-cloudflare-infra.md lists these, but the first version of this plan left them out. They only touch proxied hostnames, so Vercel's DNS-only `www` is unaffected.
  - Add the Cache Rule, the Transform Rule (static `Access-Control-Allow-Origin: *`) and Smart Tiered Cache.
  - Upload one probe: `probe/snippet.m4a`, a copy of an existing snippet, with immutable `Cache-Control` and `audio/mp4`.
  - Write `scripts/check-edge.sh` with the media rows of the spec's acceptance table.
  - **Acceptance:**
    - `scripts/check-edge.sh media` passes:
      - the second request is a `HIT`
      - `cache-control: public, max-age=31536000, immutable` and `content-type: audio/mp4`
      - `206` for a range
      - `access-control-allow-origin: *` on a cached copy primed without `Origin`
      - `http://` redirects to `https://`
    - `r2.dev` is disabled
  - **Verify:** run the script twice, with a cache purge of the probe in between to prove the `HIT` comes from the rule.
  - **Depends on:** CF-1 (zone active)
  - **Files:** `scripts/check-edge.sh`
  - **Size:** S
  - **Note:** the probe stays in the bucket. Deleting R2 objects is something Reno does, not me.

- [ ] **CF-4: Workers Builds connected to GitHub, with a preview URL for `redesign`** 👤 🔒 *(push)*
  - Reno connects the repo in Workers Builds with these settings:
    - production branch `main`
    - build command `npm run ci`
    - production deploy `npx wrangler deploy`
    - branch deploy `npx wrangler versions upload`

    Then I push `redesign`.
  - **Acceptance:**
    - the push produces a preview URL serving `/` and `/system`
    - the build log shows Node 24 and the lint, typecheck and test steps running
    - `main` and production are untouched (`curl` still shows `server: Vercel`)
  - **Verify:** the build log, then `curl` and the built-in browser on the preview URL. Note whether a GitHub status check appears.
  - **Depends on:** CF-2, DS-2
  - **Files:** `wrangler.jsonc` (if the previews setting needs changing), `SPEC-cloudflare-infra.md` (answer its open questions 1 and 4)
  - **Size:** S

### Checkpoint 3
- [ ] The preview URL serves the latest `redesign` push
- [ ] `scripts/check-edge.sh media` passes
- [ ] Production is still Vercel, and still `200`

---

## Phase 4: Surfaces

- [x] **DS-7: Textures, the glass surface and `Screen`**
  - The utilities in `textures.css`:
    - `.dg-grain`, `.dg-scanlines`, `.dg-halftone`, `.dg-tape` (the V5 shadows), `.dg-glow`, `.dg-sticker` and `.dg-vignette`
    - `.dg-glass`: the glass colour and blur, with a solid `--dg-surface` fallback under `@supports not (backdrop-filter: …)`, used by the header and filter boxes

    The `Screen` page frame renders grain and vignette as one fixed layer, pads for the safe areas, and wraps every page from the root layout. Grain starts as an SVG `feTurbulence` tile, with AVIF as the fallback.
  - **Acceptance:**
    - grain and vignette are one fixed, `pointer-events: none` layer, and grain opacity is 0.08 or less
    - `Screen` clips horizontal overflow with `overflow-x: clip`, not `hidden`, so sticky children still stick
    - `.dg-glass` shows solid `--dg-surface` when `backdrop-filter` is unsupported (tested by disabling the property in DevTools)
    - no layout shift (CLS 0 on `/system`)
    - with 4× CPU throttling, scrolling `/system` shows no long frames caused by the texture layer
    - jitter stops under reduced motion
  - **Verify:**
    - a DevTools performance trace with throttling
    - side-by-side screenshots in Safari and Chrome
    - the spec updated with the grain approach that ships
    - **Canvas:** `StyleTile.dc.html` at 1440 px, the "Motifs · textures" tiles (grain, scanlines, halftone, stacked tape, glow, sticker). `Main.dc.html` at 390 px for the vignette. Grain is expected to look a little fainter (spec 0.07, canvas 0.09)
  - **Done 3 Nov 2026.** `Screen` wraps every page from the root layout, and `body.css` is gone. `textures.css` holds the eight utilities plus the page ground (`html` background, no body margin). `/system` has a Textures section, and `tests/system-textures.test.ts` fails if a utility or texture token has no sample there. Decisions:
    - **Grain is normal-blended and static. Reno chose both on 3 Nov 2026, and the spec is updated.** On tape black, the spec's `overlay` at 0.07 measured sd 0 (invisible), normal at 0.07 measured sd 1.61, and the canvas (screen, 0.09) measured sd 2.08. So the jitter criterion doesn't apply, and a test fails if `textures.css` gains any animation.
    - **The grain tile is the canvas's `feTurbulence` SVG**, inline in `textures.css` (371 bytes), with its filter region pinned to the tile so it repeats seamlessly at 256 px. No AVIF.
    - **Grain and vignette are one fixed element.** The vignette is its background, and the grain is its `::after` at `--dg-grain-opacity`. That only works because the grain has no blend mode.
    - **`.dg-glow` is text-shadow only.** Lit boxes use `--dg-glow-accent-box`, and the spec now says so.
    - **`viewportFit: "cover"`** is set in the root layout, because without it the safe-area insets `Screen` pads by are always 0.
    - **`Screen` is imported from its own file in the layout, not `index.ts`.** Importing the barrel would put every later component's CSS on every page.
    - **Gotcha for DS-24 and later:** a `background` shorthand in a component's CSS module loads after `textures.css` and resets `.dg-scanlines` and `.dg-vignette`. Use `background-color` for the colour. The first Textures section build hit this: its scanlines didn't draw.
  - **Checks.** Chrome isn't installed, so with Reno's OK these ran in headless Brave 1.98 (Chromium 156) over the DevTools protocol, against `npm run build` served locally:
    - 360, 768, 1280, 390 and 1440 px: no horizontal scroll and no console errors or warnings. The layer is fixed, `inset: 0`, `pointer-events: none`, z-index 300, and doesn't take a click at the centre. `Screen` computes `overflow-x: clip`.
    - **4× CPU, touch-scrolling the whole of `/system` at 360 px and back,** 8 runs alternating with and without the layer: no long animation frames, and the worst frame gap was 17 ms either way. The trace (`trace-system-360-4x.json`, in the session scratchpad only) has no `Paint` events during the scroll. One cold, traced run had a single 117 ms task. The trace shows nothing of the page's own inside it, and it didn't recur.
    - **Glass without `backdrop-filter`.** I rewrote the stylesheet over the protocol, flipping the `@supports` condition and dropping the blur, the same edit as disabling it in DevTools. `.dg-glass` then computes `rgb(14, 17, 32)` (`--dg-surface`). Disabling the property alone doesn't trigger `@supports not`, so the acceptance wording undersells the check.
    - **Reduced motion, emulated:** nothing on the page animates, and the motion samples run 0 transitions, against 3 without emulation.
    - **CLS: DS-7 adds none.** Cold loads shift by 0.001–0.005, but the same shifts happen at Checkpoint 2's commit. The sources are the VT323 captions, moving when VT323 (not preloaded) swaps in. Left for DS-25.
    - **Keyboard:** DS-7 adds no focusable element. The motion checkbox is still the only one.
    - **Safari:** rendered through WKWebView (the WebKit in Safari 27.0.1) with a Swift script, not the Safari app. Every sample matches Chromium. WebKit's grain is about 20% softer (sd 1.3 against 1.65), with the same mean.
    - **Not checked:** a real phone, and the built-in pane at full size (it stayed hidden).
  - **Canvas drift, for Checkpoint 4:**
    - **Vignette:** centred, as the spec reads, where the phone board has it at `50% 35%`. At 390 × 844, the top corners darken 27% (canvas 10%), and the bottom corners 27% on both. It also lies over the header box, where the canvas puts it underneath, so DS-18's header will show darker top corners. Changing `--dg-vignette` to `ellipse at 50% 35%` would match the canvas.
    - **Scanlines** use the token's 22%. The tile's sample uses 55%.
    - **The glow sample** is an amber PLAY readout. The tile's is a hazard REC, and the spec has only sodium glow tokens.
    - **The sticker sample** is a halftone square until DS-14's fixture covers exist. The tile uses a cover.
    - **The stacked-tape "Aa"** is `--dg-text-display-l` (36 px at 1440), where the tile uses 30 px. An artwork-tone "Aa" sits beside it.
    - **Layout:** four tiles a row in the 632 px column, where the tile has two a row in 300 px. Glass and vignette are extra tiles.
  - **Depends on:** DS-6
  - **Files:** `src/design-system/textures.css`, `src/design-system/components/Screen/*`, `src/app/layout.tsx`, `src/app/system/sections/TexturesSection.tsx`. Also `src/design-system/index.ts` (new), `src/app/system/sections/textures.ts`, `src/app/system/system.module.css`, `tests/textures.test.ts` and `tests/system-textures.test.ts`, plus the spec and plan edits above, with `src/app/system/body.css` deleted
  - **Size:** M

- [x] **DS-8: The drifting grid backdrop**
  - `.dg-backdrop`, rendered by `Screen` as one fixed layer behind all content:
    - an ultramarine grid of 32 px cells below 768 px and 40 px from 768 px
    - roughly even strength from top to bottom
    - a downward drift in a seamless loop (5 s on a phone, 6 s on desktop)
    - a soft ultramarine glow in the upper part of the screen, behind where the hero sits
  - **Acceptance:**
    - the loop translates exactly one cell per cycle, with no visible jump
    - the animation touches `transform` only: paint flashing shows no per-frame repaint
    - the grid has no fade mask, and is as strong at the bottom of a long page as at the top
    - it's static under reduced motion
    - fail-fast check for DS-18 and DS-21: a plain `.dg-glass` box scrolled over the drifting grid shows no long frames at 4× CPU. If it does, apply the mitigation in plan.md's risks and record which
  - **Verify:**
    - a performance trace with 4× throttling
    - paint flashing
    - reduced-motion emulation
    - **Canvas:** `Main.dc.html` at 390 px and `HomeDesktop.dc.html` at 1440 px, both with Tweaks › background set to grid. Cell size, line strength, glow position and drift speed match
  - **Done 3 Nov 2026.** `Screen` renders `.dg-backdrop` as its first child, fixed at z-index −1, so it lies over the `html` ground and under everything in flow. Grain and vignette stay on top at 300. In `textures.css`, the glow is the host's background, and the grid is its `::before`, one cell taller than the host. One `conic-gradient` tile per cell draws the top and left edges, so lines don't double up where they cross, and `transform` moves the layer down one cell per `--dg-grid-drift`. The glow's shape and position are read off the boards (70% at 50% 20% on a phone, 60% at 30% 25% from 768 px), and the spec now gives them. `/system`'s Textures section has a Grid backdrop tile, and `tests/system-textures.test.ts` now fails if a `--dg-grid-*` token has no sample. `tests/textures.test.ts` checks the one-cell loop, transform-only keyframes, reduced motion, no mask and the fixed layer.
  - **Checks.** In headless Brave 1.98 (Chromium 156) over the DevTools protocol, and in headed Brave through the DevTools MCP, against `npm run build` served locally:
    - **360, 768, 1280, 390 and 1440 px:** no horizontal scroll, and no console errors or warnings. The layer is fixed, `inset: 0`, z-index −1 and `pointer-events: none`, and it doesn't take a click at the centre. Cells are 32 px, then 40 px, the drift is 5 s, then 6 s, and the grid layer is exactly one cell taller than the viewport.
    - **The loop:** held at the end of a cycle, the frame is pixel-identical to its start (largest channel difference 0) at 390 and 1440 px. Half a cycle moves the lines exactly half a cell.
    - **Paint flashing:** over 3 s of drift there were 5 `Paint` events, and no paint rects on screen. A control drifting by `background-position` repainted the whole screen every frame (378 events). No animation reported `compositeFailed`.
    - **Glass over the drift at 4× CPU:** two fixed `.dg-glass` boxes sat at the header and filter positions while touch-scrolling the whole of `/system` at 360 px and back. Over 13 headless runs, alternating glass over the drift, no glass, and glass over a still grid, there were no long animation frames and no long tasks. The worst frame gap was 17 ms. In headed Brave on the Mac's GPU, 9 warm runs had none either, with a worst gap of 10 ms. **No mitigation is needed.** Two one-offs didn't recur:
      - In a fresh headless browser, eight 200–360 ms `GPUTask`s ran when the glass first appeared mid-scroll (first use of the blur, in software GL).
      - The first traced headed run had one 243 ms frame.
    - **Reduced motion, emulated:** no drift animation runs, and the backdrop's frame doesn't change over 1 s.
    - **Keyboard:** DS-8 adds no focusable element.
    - **Safari:** WKWebView draws the grid and the glow at 390 and 1280 px. Its drift wasn't checked.
    - **Not checked:** a real phone, 3× displays, and the built-in pane.
  - **Canvas drift, for Checkpoint 4** (side-by-sides in the session notes, `ds-8/`):
    - **Line strength.** Our lines are about 1.9× as strong as the canvas's:
      - Each canvas tile strokes a 1 px line along its own edge and clips half of it, so the canvas lines are 0.5 px wide, at 50% (45% from 768 px) under the fade. The spec's 38% (32%) is that opacity times the fade, applied to a full 1 px line.
      - Measured as the blue a line adds, top / middle / bottom of a phone screen: canvas 47 / 47 / 43, ours 85 / 89 / 92.
      - `--dg-grid-line` at 20% (17% from 768 px) would give 46 / 49 / 48. On desktop: canvas 38 / 38 / 37, ours at 17% 36 / 39 / 41.
    - **No fade.** The canvas fades its grid from 85% to 70%, top to bottom (80% to 65% on desktop). Ours is even, as the spec says.
    - **The glow matches** the canvas at every point sampled, on both boards.
  - **Depends on:** DS-7
  - **Files:** `src/design-system/textures.css`, `src/design-system/components/Screen/*`, `src/app/system/sections/TexturesSection.tsx`
  - **Size:** M

### Checkpoint 4: Surfaces
- [x] With nothing on it, the page (backdrop, grain, vignette) matches `Main.dc.html` and `HomeDesktop.dc.html`. **Reno settled both open items on 3 Nov 2026. The tokens and spec rows are updated:**
  - **Grid lines are 20%, or 17% from 768 px** (they were 38% and 32%). The spec's value came from applying the canvas's stroke opacity times its fade to a full 1 px line, but each canvas tile clips half its stroke. The blue a line adds, top / middle / bottom, measured on the bare page with grain and vignette:
    - phone: canvas 39 / 39 / 39, before 68 / 77 / 84, now 37 / 41 / 44
    - desktop: canvas 35 / 33 / 35, before 61 / 67 / 72, now 34 / 35 / 40
  - **The vignette sits at `50% 35%` on phones and is `none` from 768 px**, as the two boards draw it. `HomeDesktop.dc.html` has no vignette at all, which DS-7 missed. On grey at 390 px, the top corners now darken 10%, the same as the board. Centred, they darkened 27%. `/system`'s Vignette tile now reads "below 768 px".
  - The side-by-sides at 390 and 1440 px are in the session notes (`checkpoint-4/`): canvas | before | proposed, and canvas | after. The canvas frames are rebuilt from each board's own grid, vignette and grain markup. After the change, `/` and `/system` at 360, 768, 1280, 390 and 1440 px show no console problems and no horizontal scroll.
- [x] The DS-7 and DS-8 performance traces are noted, with no long frames at 4× CPU:
  - **DS-7:** 8 runs, none, with a worst gap of 17 ms.
  - **DS-8, warm runs:** none, headless or headed, with worst gaps of 17 and 10 ms.
  - **DS-8, cold first runs:** these did have long frames. The first two runs in a fresh headless browser had frames of up to 693 ms (glass over the drift) and 181 ms (no glass), recorded in `ds8-report.json`. The first traced headed run had one of 243 ms. DS-8's note gives the first and the last of these, not the 181 ms. Watch the cold case when DS-18 puts real glass on the page.
  - The checkpoint's token changes only alter colours, so nothing was re-traced.
- [x] Drift from the canvas is listed. What's left on the bare page is where the spec wins (plan.md's known cases):
  - **Grain:** 0.07 with normal blending, against the canvas's 0.09 screen.
  - **No fade on the grid.**
  - **The vignette lies over the header and the bar on phones.**
  - The `/system` samples differ from the style tile as DS-7 listed.

---

## Phase 5: Primitives

- [x] **DS-9: `SparkleStar`**
  - The four-point star drawn for this system on the canvas, as `assets/sparkle-star.svg` and an inline-SVG component with `size` and `twinkle?`. It's filled with `currentColor`, which defaults to `--dg-star`, so the hero's label row can show it in amber as on the canvas. It's decorative (`aria-hidden`) unless given a label.
  - **Acceptance:**
    - the twinkle uses `steps()` timing and stops under reduced motion
    - the SVG is under 1 KB
    - it's `aria-hidden` by default, and `role="img"` with a name when labelled
  - **Verify:**
    - reduced-motion emulation
    - the accessibility tree via `read_page`
    - **Canvas:** `StyleTile.dc.html` at 1440 px, the motif row with the star at 56, 28 and 14 px
  - **Done 3 Nov 2026.** `SparkleStar` draws the canvas path inline. The path, the viewBox and the label-to-attributes logic live in `star.ts`, so the tests can import them. Its CSS sets `color: var(--dg-star)`, and the path fills with `currentColor`, so a parent retints the star by setting `--dg-star`. `/system`'s hero-label sample sets it to the accent. `assets/sparkle-star.svg` is 210 bytes. `/system` has a Marks section, with the static and twinkling rows at 56, 28 and 14 px, the hero label, and the file itself. `tests/sparkle-star.test.ts` checks the attributes, the file's size, path and colour, `steps()` timing, opacity and transform only, and reduced motion. Decisions:
    - **The twinkle is DS-9's proposal, for Checkpoint 5.** The canvas draws every star still. Every 2.4 s (20 × `--dg-dur-1`), it snaps to 70% size at 40% opacity, then 85% at 70%, then back, one `--dg-dur-1` each. The spec now describes it.
    - **The file bakes in signal yellow, not `currentColor`.** With `currentColor`, it would render black as an `<img>` or in a design tool. A test ties the hex to `--dg-star`.
    - **`size` is a number of px**, as the canvas sizes every star.
    - **Gotcha for DS-10 and later:** a `/system` section imports its component from the component's own file, never through `index.ts`. Through the barrel (which also exports `Screen`), Turbopack put all of `/system`'s CSS, the twinkle included, into the chunk `/` loads. A build of the previous commit showed that this change caused it. With the direct import, `/` loads the same CSS chunk as before.
  - **Checks.** These ran in headed Brave through the DevTools MCP, and in headless Brave over the protocol (`ds-9/tools/` in the session notes), against `npm run build` served locally:
    - **Accessibility tree:** the labelled star is `image "Sparkle star"`. The six other stars and the file's `alt=""` image don't appear.
    - **Computed:** signal yellow by default, `rgb(255, 178, 63)` in the hero label. The twinkle is `steps(1)` over 2.4 s, from the star's centre. Stepping the animation by hand shows full size until 1.92 s, then 0.4 opacity at 0.7× for 120 ms, then 0.7 at 0.85× for 120 ms, then full, with no eased values in between.
    - **Reduced motion, emulated:** nothing on the page animates (5 animations without it: two drifts and three twinkles). The twinkling stars hold full size and opacity for 3 s, longer than one cycle.
    - **360, 768, 1280, 390 and 1440 px,** on `/system` and `/`: no horizontal scroll, no console errors or warnings, and the stars stay inside the column. `/` has no star. None of its JS chunks holds star or `/system` code.
    - **Keyboard:** DS-9 adds no focusable element. The motion checkbox is still the only one.
    - **Canvas:** the board's motif-row markup, rebuilt in headless Brave at 1440 px, is pixel-identical to `/system`'s static row at 56, 28 and 14 px (0 pixels differ). The board was also opened in the built-in pane, at Fit scale, since the hidden pane is 800 px wide.
    - **Not checked:** Safari, a real phone, and the twinkle on a real screen beyond screenshots and stepped frames.
  - **Canvas drift, for Checkpoint 5:**
    - The motif row's gap is 16 px (`--dg-space-4`), where the tile uses 18 px. The caption sits under the row, not beside it.
    - The twinkle has no canvas reference.
    - `/system` shows seven stars and the file at once, more than the "at most three on screen" principle allows. It's a test bench, so it's listed only.
  - **Depends on:** DS-6
  - **Files:** `src/design-system/assets/sparkle-star.svg`, `src/design-system/components/SparkleStar/*`, `src/app/system/sections/MarksSection.tsx`. Also `src/app/system/system.module.css`, `tests/sparkle-star.test.ts` and the spec edits above
  - **Size:** S

- [x] **DS-10: `Wordmark`**
  - Outline "Déjà Gatsby" from Aero's glyphs in the DS-5 venv (fonttools' SVG pen), with the path data rounded.
  - The component is inline SVG: three uses of one path, with V5's hazard-at-55% and ultramarine copies under a bone fill, all filled from tokens.
  - Props:
    - `size: xl | l` from the type tokens
    - `tone: screen | artwork`. Artwork is white with the `0.045em 0.06em` black drop that the spec's Assets section defines

    `assets/wordmark.svg` is exported in the screen tone, with the colours baked in.
  - **Acceptance:**
    - with font requests blocked in DevTools, the wordmark still renders identically
    - the shadow offsets equal the spec's em values, measured in the SVG's units
    - it has an accessible name of "Déjà Gatsby"
    - `wordmark.svg` is under 6 KB
  - **Verify:**
    - block font requests and reload
    - file size
    - **Canvas:** `WordmarkVariants.dc.html` at 1440 px, the V5 cell at both sizes, and V7 for the artwork tone. The header wordmark on `Main.dc.html` at 390 px and `HomeDesktop.dc.html` at 1440 px
  - **Done 3 Nov 2026.** The DS-5 venv outlined the string from `~/Downloads/Aero.ttf`, the canvas's own file. Aero has no kern, GPOS or GSUB tables, so each glyph sits at its advance. The path is 1,885 bytes, in whole font units on Aero's 1000-unit em. `outline.ts` holds the path, the svg's attributes and each tone's copies, so the tests can import them. `Wordmark.tsx` draws the path once in `<defs>` and fills one `<use>` per copy, with a `useId` id per instance. Screen is hazard at 55%, then ultramarine, then `--dg-fg`. Artwork is `--dg-ink-950` under `--dg-white`. `assets/wordmark.svg` is 2,183 bytes. `/system` › Marks has a Wordmark block beside the star: xl, l, artwork on a `--dg-panel` stage, and the file. `tests/wordmark.test.ts` (13 tests) parses `--dg-tape` and `--dg-tape-artwork` and checks that each copy's offset in font units, divided by the em, and its fill equal the token's shadows. It also checks the size classes, the file's size, title, path, offsets, colours, and that its viewBox clips nothing. Decisions:
    - **The component's box is the type's own at line-height 1:** 6.099em × 1em, with the baseline 776 units down, where macOS and iOS put it (hhea). The ink is centred in it, at 86 to 914 units. It has `overflow: visible`, so the D's 0.03em slant and the tape draw past the box, as they do on type. In every board container (both V5 cells, V7, and both header boxes), the svg's box lands exactly where the board's span does, to 0.016 px. DS-18 gets the canvas's header layout without adjustment.
    - **The file's viewBox is the whole mark,** −30 86 6190 910, and its size, 619 × 91, is the mark at a 100 px em. It uses SVG 2 `href` on `<use>`, which Brave and QuickLook (WebKit) both draw. The spec now says this.
    - **The data file is `outline.ts`, not `wordmark.ts`.** On a case-insensitive disk, TypeScript rejects `wordmark.ts` beside `Wordmark.tsx`.
    - `tone` defaults to `screen`, and the name "Déjà Gatsby" is fixed.
  - **Checks.** These ran against `npm run build` served locally: in headless Brave over the protocol (`ds-10/tools/` in the session notes), and in headed Brave through the DevTools MCP.
    - **Fonts blocked:** `Network.setBlockedURLs` blocked all six font requests, and every face reported `error`. All three wordmarks kept their size and were pixel-identical to the loaded run, at 390 and 1280 px.
    - **Accessibility tree:** three `image "Déjà Gatsby"` nodes, plus the star. No path or use nodes are exposed, and the file's `alt=""` image doesn't appear.
    - **Shadow offsets:** 60, 80 and 30, 40 units for screen, and 45, 60 for artwork. Over the 1000-unit em, they equal the tokens' em values exactly (the test).
    - **360, 768, 1280, 390 and 1440 px:** no horizontal scroll and no console problems. The computed fills are the tokens. The only thing past the column is the D's slant, under 2.2 px, which reaches into the page padding as type does. `/` has no wordmark, and its CSS chunk holds no wordmark or `/system` rule.
    - **Keyboard and motion:** DS-10 adds no focusable element and no animation. Under reduced motion, nothing on the page animates.
    - **Canvas:** the board's markup was rebuilt in headless Brave with its own Aero TTF, then compared with ours in the same containers, at 72 px (V5, V7), 28 px (V5 header size and `Main`'s header at 390 px) and 36 px (`HomeDesktop`'s header at 1440 px). Our boxes match exactly. The ink differs only in rasterising. With font smoothing off on the board's type and its baseline snap applied to ours, pixels differing by more than 64 fall from 1,155 to 19 in the phone header. The board was also opened in the built-in pane at Fit scale and checked by eye.
    - **Not checked:** Safari and a real phone. WebKit was tried on the file only (QuickLook).
  - **Canvas drift, for Checkpoint 5:**
    - **On a Mac, the board's type looks a hair heavier** than the outline, because macOS font smoothing thickens text and not paths. On phones, as drawn, there's no such smoothing.
    - **Brave snaps the type's baseline to a whole pixel.** It sits at 21 px in a 28 px box, where ours stays at 21.73. At 36 and 72 px the gap is under 0.13 px.
    - **The V5 cell's small sample is 28 px at 1440 px.** By G1, the l size is 36 px from 768 px, so it was compared at 390 px, where l is 28 px.
    - **The artwork tone sits on a `--dg-panel` stage on `/system`,** not on a cover. Fixture covers come with DS-14.
  - **Depends on:** DS-5, DS-6
  - **Files:** `src/design-system/assets/wordmark.svg`, `src/design-system/components/Wordmark/*`, `src/app/system/sections/MarksSection.tsx`. Also `src/app/system/system.module.css`, `tests/wordmark.test.ts` and the spec edits above
  - **Size:** M

- [x] **DS-11: `Button`**
  - Three variants, as settled by G2:
    - `primary`: amber with the cut corner
    - `ghost`: outline
    - `hardware`: the square icon button for stop, replay and close

    An optional icon. Default, hover, focus-visible, active and disabled states.
  - **Acceptance:**
    - a 44 px minimum target (primary is 48 px, as drawn)
    - a visible `--dg-focus` ring on keyboard focus only, and the cut corner doesn't clip it
    - disabled uses the `disabled` attribute, so it's announced and can't be focused
    - icon-only buttons need an accessible name (enforced by the prop types)
    - the label passes contrast in every variant
  - **Verify:**
    - Tab through `/system`
    - the contrast test covers the label pairs
    - **Canvas:** `StyleTile.dc.html` at 1440 px, the Components row (Play snippet, Ghost, Stop, Focus ring). The "Play snippet" button on `Main.dc.html` at 390 px
  - **Done 3 Nov 2026.** `Button` renders one `<button type="button">`. `glyphs.ts` holds the four glyphs the canvas draws on buttons (play, stop, replay and close) at its sizes, painted in `currentColor`. The props require a `label` on every button: the visible text on primary and ghost, and `aria-label` on hardware. They also require an `icon` on hardware, so no button can be nameless. Primary's chamfer clips a `::before` layer behind the label, so the button's own outline is never clipped. `/system` has a Buttons section with each variant at rest and disabled, and hover, press and focus live. `tests/button.test.ts` (32 tests) checks the props through `@ts-expect-error` lines, which `npm run typecheck` runs. It reads `Button.module.css` for the sizes, the ring (keyboard only, `--dg-focus`, standing off the button), the clip on the inner layer only, and hover and press keyed to `:enabled`. It also checks every label pair in every state: 4.5:1 for text and 3:1 for the hardware icon, on `--dg-bg`, `--dg-surface` and `--dg-surface-raised`. Four mutations each failed the right test: the clip on the button, a 40 px hardware button, hover without `:enabled`, and a dim ghost label. Decisions:
    - **The state looks are DS-11's proposal, for Checkpoint 5.** The canvas draws only rest. Hover and press light the button: primary takes `--dg-glow-accent-box` as a drop-shadow that follows the cut corner, while ghost and hardware fill with `--dg-surface-raised` and their border turns `--dg-fg`. Press also pushes it down 1 px. Disabled primary is `--dg-fg-subtle` on `--dg-surface-raised`, the lamp off. Each change is a snap, with no transition. The spec now describes them.
    - **`label` is required on every button,** where the spec said "required when icon-only". A text button's label is its text, so its name can't drift from what it shows.
    - **`icon` is a name, not a node,** so the button sizes and colours the glyph and hides it from assistive tech. A later task that needs another icon adds a glyph.
    - **There's no `pressed` prop yet.** DS-23's "Stop snippet" needs `aria-pressed`, and adds it then.
    - **There's no `"use client"`.** The button holds no state, and a client parent that passes `onClick` brings it into the client bundle.
    - **Padding and gap are the nearest space tokens,** per SPEC.md's rule against raw spacing: 16 and 24 px with an 8 px gap on primary (the board has 18, 22 and 10), and 16 px on ghost (the board has 20).
    - **Hover and press aren't pinned on `/system`.** Pinning them would need a prop or selector that exists only for the bench, so the checks forced them through the protocol instead.
  - **Checks.** These ran against `npm run build` served locally: in headless Brave over the protocol (`ds-11/tools/` in the session notes), and in headed Brave through the DevTools MCP.
    - **360, 768, 1280, 390 and 1440 px:** primary 177.3 × 48, ghost 87.6 × 48 and hardware 44 × 44 at every width. No horizontal scroll, the ring always has room on screen, and there are no console problems. `/` has no button, none of the seven files it loads holds a Button class, and its CSS chunk is still `0jh8-bqbyvw1l.css`.
    - **States, forced through `CSS.forcePseudoState`:** the computed colours are the tokens. The label contrast is 11.1:1 on primary, 4.6:1 on disabled primary, 16.8:1 on ghost and hardware at rest (14.3:1 hovered or pressed), and 5.4:1 disabled. Press moves the button 1 px, and no button has a transition.
    - **Ring and chamfer, in pixels:** focused, the signal-yellow ring is whole 3 px outside the cut corner and at four other points, while the corner inside the box shows the ground. Hover lights the edge below the primary (19,21,48 becomes 81,63,54).
    - **Keyboard:** at 360 and 1280 px, Tab goes from the motion checkbox through the seven enabled buttons in order, each with the ring, and skips the three disabled ones. Shift+Tab goes back. A mouse click focuses a button without the ring, and a disabled button doesn't take focus.
    - **Accessibility tree:** ten buttons, with the three disabled ones marked disabled. The hardware buttons are "Stop snippet", "Replay snippet" and "Close player". No glyph is exposed. Brave builds a text button's name from its rendered text, so it reads "PLAY SNIPPET" in capitals.
    - **Reduced motion:** nothing on the page animates, and the buttons have no transitions to stop.
    - **Canvas:** the tile's Components row and `Main`'s hero button were rebuilt from the board source in headless Brave, at 1440 and 390 px and in our Chakra Petch, beside ours. Heights, label widths (113.34 px) and label lines (15 px down) match. The widths differ only by the spacing tokens. The board was also opened in the built-in pane at Fit scale and checked by eye.
    - **Not checked:** Safari, Windows and a real phone, including whether iOS shows `:active` on a tap.
  - **Canvas drift, for Checkpoint 5:**
    - Primary is 2 px narrower and ghost 8 px narrower than drawn, from the spacing tokens.
    - The tile's Stop is 48 px. The spec's 44 px is built, as the bar boards draw it.
    - The ended bar's Close is drawn borderless in `--dg-fg-muted`. The spec makes it a hardware button, so it's outlined in `--dg-fg`. DS-24 inherits this.
    - The ring round the primary is a square box and doesn't follow the cut corner. The tile's ring sample is rounded by 4 px, as ours is on ghost and hardware.
    - Hover, press and disabled have no canvas reference.
  - **Depends on:** DS-6, and G2 answered
  - **Files:** `src/design-system/components/Button/*`, `src/app/system/sections/ButtonSection.tsx`. Also `src/app/system/system.module.css`, `tests/button.test.ts` and the spec edits above
  - **Size:** S

- [x] **DS-12: `VhsReadout`**
  - The load, play, stop and ended modes, using `formatTime`. It reads "PLAY 00:12 / 00:30", or "END 00:30 / 00:30" when ended, as on the canvas. The glyphs come from VT323 or the SVG fallback, as DS-5 found. Play glows amber, and ended drops to `--dg-fg-muted`.
  - **Acceptance:**
    - a screen reader reads the text correctly, with the glyphs `aria-hidden`
    - it's never below the 18 px readout floor
    - it isn't a live region, so it never announces every second
  - **Verify:**
    - the accessibility tree via `read_page`
    - **Canvas:** the readout in `PhonePlaying.dc.html` and `PhoneEnded.dc.html` at 390 px, and the VT323 sample in `StyleTile.dc.html` at 1440 px
  - **Done 4 Nov 2026.** `VhsReadout` renders one `<span>`: the mode's glyph as an 11 px SVG (`aria-hidden`), then the text. `modes.ts` holds each mode's word, glyph and whether it's lit, the glyph paths, and `readoutText()`, which builds "PLAY 00:12 / 00:30" through `formatTime`, so the tests can import them. Play and the square are the bar boards' own paths. VT323 has none of `▶■◌`, so no glyph is ever text. The CSS sets VT323 at `--dg-text-readout` with `nowrap`, muted by default, and `.lit` adds `--dg-accent` and `--dg-glow-accent` for play. `/system` has a Readout section with each mode on a `--dg-surface-raised` strip (the bar's surface), plus load before the length is known ("--:--"). `tests/vhs-readout.test.ts` (22 tests) checks the text in every mode, that it holds only Basic Latin and capitals, the glyph per mode and its size, that only play is lit, the glyph's `aria-hidden` and the absence of any live-region attribute or role in the `.tsx`, the one font size and its floor at 360 and 1280 px, the colours and glow, no motion, and 4.5:1 lit and muted on the bar and the page. Five mutations each failed the right test: `aria-live` on the span, the glyph without `aria-hidden`, a second font size, `▶` in the text, and stop lit. Decisions:
    - **Load and stop are DS-12's proposal, for Checkpoint 5.** The canvas draws neither. Both are muted with no glow, like ended, so the lamp is lit only while the tape runs. Stop takes the square, and load takes a dotted circle, eight dots on a ring. Neither moves. The spec now describes them.
    - **The word is written in capitals,** not set with `text-transform`. Brave puts transformed capitals in the accessible name (DS-11), and other browsers may not, so the text read is the text shown everywhere.
    - **The gap is `--dg-space-2` (8 px),** the nearest token. The bar boards draw 6 px and the style tile 8 px.
    - **`elapsed` isn't pinned to `duration` when ended.** The component shows what it's given. At the `ended` event, `currentTime` equals the duration, so the parent's value reads "END 00:30 / 00:30".
    - **It's a `<span>`,** so it can sit in any phrasing context.
  - **Checks.** These ran against `npm run build` served locally: in headless Brave over the protocol (`ds-12/tools/` in the session notes), and in headed Brave through the DevTools MCP.
    - **360, 768, 1280, 390 and 1440 px:** 20 px below 768 and 22 px from it, in VT323, the glyph 11 × 11 and centred on the line. Play is `rgb(255, 178, 63)` with the glow, and the rest `rgb(189, 182, 166)` with none. No horizontal scroll, every readout stays inside its strip, and there are no console problems. `/` has no readout, none of its six files holds the readout's class, and its CSS chunk is still `0jh8-bqbyvw1l.css`.
    - **Fonts:** `CSS.getPlatformFontsForNode` reports VT323 alone for every readout, with one glyph per character, so the line never switches typeface.
    - **Accessibility tree,** headless and headed: each readout is one text node ("PLAY 00:12 / 00:30", "END 00:30 / 00:30" and so on) under an ignored generic. No glyph is in the tree, and nothing in the section is live. The page's only live region is Next's route announcer.
    - **Keyboard:** Tab still makes 8 stops at 360 and 1280 px, as after DS-11. None is in the readout section.
    - **Reduced motion:** nothing on the page animates (5 animations without it, as before). The readouts have no animation or transition.
    - **Canvas:** the readout markup from `Main`'s bar (playing and ended) at 390 px, `HomeDesktop`'s bar at 1440 px, and the tile's 28 px sample were rebuilt in headless Brave in our VT323, on the bar's surface, beside ours. The text is pixel-identical in all four (0 pixels differ by more than 64), and so are the box heights and the glyph's centring on the text. The tile case set ours to 28 px for the comparison.
    - **Not checked:** Safari, Windows, a real phone, and a real screen reader. The board wouldn't zoom to the player row in the built-in pane, so it wasn't checked there by eye.
  - **Canvas drift, for Checkpoint 5:**
    - The text sits 2 px further from the glyph than on the bars (8 px gap against 6), from the spacing token. It matches the tile.
    - The tile's sample glyph is 13 px at 28 px. The built glyph is 11 px at every size, as the bars draw it.
    - Load and stop have no canvas reference. The dotted circle is faint at 11 px.
  - **Depends on:** DS-2, DS-6
  - **Files:** `src/design-system/components/VhsReadout/*`, `src/app/system/sections/ReadoutSection.tsx`. Also `src/app/system/system.module.css`, `tests/vhs-readout.test.ts` and the spec edits above
  - **Size:** S

- [x] **DS-13: `ProgressTape`**
  - The 3 px strip at the top of the player bar: an amber fill with its glow, on a `--dg-line` track. It's driven by the `--progress` custom property through `transform: scaleX()`, so it causes no layout.
  - **Acceptance:**
    - it's `aria-hidden`
    - at 0 and 1 it renders flush, with no overflow
    - it doesn't animate under reduced motion
  - **Verify:**
    - a visual check at 0, 0.5 and 1
    - **Canvas:** the strip in `PhonePlaying.dc.html` at 390 px and `HomeDesktop.dc.html` at 1440 px
  - **Done 4 Nov 2026.** `ProgressTape` renders two `<div>`s: an `aria-hidden` track that sets `--progress` inline (the one inline style SPEC.md allows), and the fill inside it. `progress.ts` holds `tapeProgress()`, which holds a ratio to 0–1 and reads NaN as 0, so the tests can import it. Without it, NaN before the audio knows its length would make `scaleX()` invalid, and the fill would show the whole track. The CSS draws the boards' strip: a 3 px `--dg-line` track, and an `--dg-accent` fill with `--dg-glow-accent-box` that keeps the track's width and is scaled by `scaleX(var(--progress))` from the left edge, so 0 and 1 sit flush. `/system`'s section is now "Readout and tape". Its Progress tape block sits beside the VHS readout, with the tape along the top of the bar's surface over the readout it goes with: 0 over load, 0.4 over "PLAY 00:12" (the boards' 12 of 30) and 1 over "END". `RunningTape` adds a "Run the tape" checkbox that runs a 30 s snippet on a 250 ms clock, as `timeupdate` does, then holds for a second and rewinds. `tests/progress-tape.test.ts` (14 tests) checks the clamp, `aria-hidden` on the root and no role or live region, that the only inline style is `--progress` through `tapeProgress`, the height and colours, the scale and its origin with no width, margin or position set, the transition and its reduced-motion stop, and 3:1 for the fill on its track. Seven mutations each failed the right test: no `aria-hidden`, `width` in place of `scaleX`, no reduced-motion rule, no NaN guard, an eased transition, the raw ratio inline, and a centre origin. Decisions:
    - **The glide is DS-13's proposal, for Checkpoint 5.** The boards step the fill once a second with no motion. The built fill moves on a linear `--dg-dur-2` transition on `transform`, close to the 250 ms between `timeupdate` events, so it doesn't jump 3 px (phone) to 12 px (desktop) four times a second. A jump back, such as replay or a new track, rewinds in the same 240 ms. Under reduced motion it jumps to each value. The spec now describes it.
    - **`scaleX`, as planned, over `translateX`.** A prototype in headless Brave compared three builds against the board's `width` sizing. `scaleX` is pixel-identical at 0 and 1. A full-width fill slid by `translateX` under `overflow-x: clip` matches the tip's glow but leaks glow in at the left edge at 0, so it isn't flush. A `drop-shadow` on an unscaled parent draws a wider, softer glow than the board's box-shadow.
    - **`linear`, not `--dg-ease-tape`,** because the fill follows a steady clock. An eased curve would make it surge at every update.
    - **The bench's running tape is a client component in `/system` only** (`RunningTape.tsx`). Nothing else exercises the transition, and `ProgressTape` itself holds no state.
    - **No `className` or position prop.** `NowPlayingBar` (DS-24) places the tape.
  - **Checks.** These ran against `npm run build` served locally: in headless Brave over the protocol (`ds-13/tools/` in the session notes), and in headed Brave through the DevTools MCP.
    - **360, 768, 1280, 390 and 1440 px:** each track is 3 px tall, the strip's width and on its top edge. Its drawn fill is 0, 0.4 and 1 of the track's width, starting at its left edge, and the full one ends at its right edge. The computed colours are `rgb(42, 48, 80)` and `rgb(255, 178, 63)`, with the glow and `transform 0.24s linear`. No horizontal scroll, and no console problems.
    - **Drawn, at 0, 0.5 and 1:** read from 390 px screenshots along the strip's middle row, the lit run is 0, 179 and 358 of 358 px (and 143 at 0.4), exactly the expected widths.
    - **No layout:** setting `--progress` 30 times, a frame apart, caused 0 layouts (67 style recalcs).
    - **Accessibility tree:** no tape or fill node, and no progressbar, meter or slider on the page. The toggle is a checkbox named "RUN THE TAPE" (Brave puts the `text-transform` capitals in the name, as DS-11 found).
    - **Motion:** while it runs, the fill took 106 different scales over 121 frames, 98 of them between the 250 ms steps, so it glides. With reduced motion emulated, it took 9, all on the steps, with no transition and no running animation. At rest, the page has 0 animations reduced and 5 without, as before. Headed Brave at 390 px gave the same results (287 different scales in 3 s, and 9 on the steps when reduced).
    - **Keyboard:** Tab now makes 9 stops at 360 and 1280 px. The new one is the "Run the tape" checkbox, with the `--dg-focus` ring, and Space starts the run.
    - **`/`:** none of its six files holds a tape class, "Run the tape" or `--progress`, and its CSS chunk is still `0jh8-bqbyvw1l.css`.
    - **Canvas:** the strip from `Main`'s bar at 390 px and `HomeDesktop`'s at 1440 px was rebuilt from the board source in headless Brave, across the width on the bar's surface, with ours beneath. Over the strip and 12 px either side, 0 pixels differ at 0 and 1. At 0.4, 29 differ, by at most 10 of 255: the tip's glow and the left end's corner (see below).
    - **Not checked:** Safari, Windows and a real phone, and real audio. A real `timeupdate` cadence is DS-24's to check. The board wasn't opened in the built-in pane.
  - **Canvas drift, for Checkpoint 5:**
    - **The glow past the tip is shorter.** It's scaled with the fill, so it reaches 8 × ratio px (3.2 px at 0.4) where the board's reaches 8 px. Above and below the tape it's the same.
    - **The glow spills past the track's ends,** as on the board: past the left end whenever there's a fill, and past the right end at 1. In the bar the track spans the screen, so it falls off-screen. On `/system` it shows past the strip.
    - The motion has no canvas reference (see the decision above).
  - **Depends on:** DS-12 (they share a section)
  - **Files:** `src/design-system/components/ProgressTape/*`, `src/app/system/sections/ReadoutSection.tsx`. Also `src/app/system/sections/RunningTape.tsx`, `src/app/system/system.module.css`, `tests/progress-tape.test.ts` and the spec edits above
  - **Size:** S

### Checkpoint 5: Primitives
- [x] DS-9 to DS-13 are on `/system` in every state, matched against `StyleTile.dc.html` and `WordmarkVariants.dc.html`. **Reno approved them on 4 Nov 2026, with the four looks the canvas doesn't draw:**
  - the star's twinkle (DS-9)
  - Button's hover, press and disabled states (DS-11)
  - the readout's muted load and stop modes (DS-12)
  - the tape's glide between updates (DS-13)

  The spec no longer calls them proposals.
- [x] Drift from the canvas is listed, under each task's **Canvas drift** line, and Reno accepted it as it stands. What carries forward:
  - **DS-24 inherits two:** the ended bar's Close is an outlined hardware button, not the board's borderless one, and the tape's glow past the tip is 8 × ratio px, not 8 px.
  - **DS-14's fixture covers** replace the `--dg-panel` stage behind the artwork-tone wordmark.
  - The rest are spacing-token roundings (Button, readout gap, motif row) and Mac font smoothing on the board's wordmark. Nothing is changed for them.

---

## Phase 6: Links and header

- [x] **DS-14: View types, the `/system` fixture and filter options**
  - `types.ts` holds the shapes the components render:
    - release: id, type single/EP/album, title, cover, tracks, lead track, links
    - track: id, title, kind original/remix/edit, duration
    - stream link and social

    `releaseFilterOptions(releases)` returns All, Singles, EPs, Albums, and Remixes & edits, with counts, leaving out any type with no releases. It counts per G6.
  - The fixture:
    - the five real releases, newest first: four singles plus the Can't You See EP with UKG 333
    - the [bracketed] album (eight tracks), remix and edit from the canvas, with `#` links for the three "More" platforms so the "More" states can be shown

    The covers are 320 px JPEGs: `sips` for the PNGs, and `qlmanage`, then `sips`, for Bring That Change's SVG. UKG 333 uses the EP cover. A plain hand-written SVG tile stands in for the bracketed releases.
  - **Acceptance:**
    - the filter-options test covers the counts, All first, empty types left out, and a remix single counted under Remixes & edits, not Singles
    - the fixture typechecks against `types.ts`
    - the fixture covers total under 200 KB
  - **Verify:**
    - `npm test`
    - `du -sh public/system-fixtures`
    - **Canvas:** the same releases, in the same order, as the discography on `Main.dc.html` with the examples Tweak on
  - **Done 4 Nov 2026.** `types.ts` holds `Release`, `Track`, `StreamLink` and `SocialLink`, plus the `PlatformId`, `SocialNetwork`, `TrackKind` and `ReleaseType` unions. `release-filter.ts` holds `releaseCategory()`, which puts each release under exactly one type, and `releaseFilterOptions()`, which returns All first, then Singles, EPs, Albums and Remixes & edits in that order, each with its count, leaving out empty types. Both and the types are exported from `index.ts`. `src/app/system/fixtures.ts` holds the eight releases in `Main.dc.html`'s order, as in its examples Tweak, and the two socials. `public/system-fixtures/` holds five 320 × 320 JPEGs and `placeholder.svg`, a hand-written ink tile with bone brackets. `/system` has a Fixture section: each release with its cover at 56 px, type, track count and the type it counts under, and the filter options with their counts. `tests/release-filter.test.ts` (11 tests) covers the counts, All first, the fixed order, empty types left out, remix and edit singles under Remixes & edits, an EP holding a remix under EPs, the lead track deciding a single, and the canvas's counts for the fixture. `tests/system-fixture.test.ts` (9 tests) checks the order against the canvas, the album's eight tracks and the EP's two, that each lead track is one of the release's own, unique ids, the three More platforms on the bracketed releases, the five main platforms on the real ones, that every cover exists, and the 200 KB budget. Three mutations each failed the right test: an EP holding a remix counted as a remix, empty types kept, and a single judged by any track instead of its lead. Decisions:
    - **A single takes its lead track's kind.** G6 speaks of "a single whose track is a remix". Every single in the catalogue has one track, and the lead track settles one with a B-side.
    - **`duration` is the snippet's length in seconds,** which is what the rows and the readout show, not the full song's.
    - **Links belong to the release.** The canvas also gives UKG 333 its own links in the player bar. `NowPlayingBar` takes its own `streamLinks`, so `site` can pass a track's links once the catalogue has them, without a second links field here.
    - **The handle is stored without its "@",** which `SocialLinks` adds.
    - **All is labelled "All",** as on the desktop buttons. The phone dropdown reads "All releases", which is DS-21's to render.
    - **The covers are JPEG quality 70.** At 80 they came to 218 KB. At 70 they're 185,478 bytes, and `du -sh` reports 192 K with the placeholder. KaiZen's cover is 1469 × 1457, so it was cropped to a centred square first, 6 px off each side. Bring That Change's SVG went through `qlmanage` at 1600 px, then `sips`.
    - **The bracketed releases carry all eight platforms with `#` links,** so DS-16 can show More from them. The real releases carry the five main ones, with the canvas's links (tracking parameters dropped) and the Bandcamp artist page.
    - **The artwork-tone wordmark now sits on the KaiZen cover** on `/system` › Marks, in place of the `--dg-panel` stage, as Checkpoint 5 carried forward. KaiZen's own cover sets the name the same way.
  - **Checks.** These ran in headless Brave over the protocol (`phase-6/tools/ds14-check.mjs` in the session notes), against `npm run build` served locally:
    - **360, 768, 1280, 390 and 1440 px:** the Fixture section lists the eight releases in the canvas's order, each cover 56 × 56 and loaded at 320 px, inside the column. The options read All 8, Singles 4, EPs 1, Albums 1, Remixes & edits 2, as on `HomeDesktop.dc.html`'s buttons and `Main.dc.html`'s dropdown. The artwork stage's cover loads and fills it, with the wordmark in front and inside it. No horizontal scroll, and no console problems.
    - **`/`:** it makes no request for any fixture file, at any width.
    - **Keyboard:** Tab still makes 9 stops. DS-14 adds no focusable element.
    - **Reduced motion:** 0 animations, against 5 without it, as before.
    - **Not checked:** headed Brave, Safari and a real phone. The placeholder tile wasn't compared with the canvas's own placeholder image, which can't be read from the board source.
  - **Canvas drift, for Checkpoint 6:**
    - The bracketed releases show our placeholder tile, not the canvas's.
    - KaiZen's fixture cover loses 6 px off each side to the square crop.
  - **Depends on:** DS-6, and G6 answered
  - **Files:** `src/design-system/types.ts`, `src/design-system/release-filter.ts`, `tests/release-filter.test.ts`, `src/app/system/fixtures.ts`, `public/system-fixtures/*`. Also `tests/system-fixture.test.ts`, `src/app/system/sections/FixtureSection.tsx`, `src/app/system/sections/MarksSection.tsx`, `src/app/system/system.module.css`, `src/design-system/index.ts` and `src/app/system/page.tsx`
  - **Size:** M

- [x] **DS-15: Platform and social icons** 🔒 *(Simple Icons download)*
  - The eight platform icons and two social icons as monochrome inline SVG, in one `PlatformIcon` component filled with `currentColor`. `platforms.ts` holds:
    - the ids
    - full and short labels (the bar at 360 px uses "YouTube" and "Amazon")
    - the fixed order: Spotify, Apple Music, YouTube Music, SoundCloud, Bandcamp, then Amazon Music, Deezer and Tidal under "More"
    - `splitLinks(links)`, which returns `{ main, more }` and leaves out missing platforms
  - **Acceptance:**
    - the test covers the order, a missing main platform left out, and an empty `more` when there are no extras
    - the icons inherit `currentColor`
    - the source and CC0 licence are noted beside them
  - **Verify:**
    - `npm test`
    - **Canvas:** `PhoneMore.dc.html` at 390 px. Icon size and stroke weight sit like the stand-ins (20–22 px). The shapes change to the real brand marks, as intended
  - **Done 4 Nov 2026.** Reno approved the download on 4 Nov 2026. Nine files came from Simple Icons 16.36.0 on jsDelivr: Spotify, Apple Music, YouTube Music, SoundCloud, Bandcamp, Deezer, Tidal, Instagram and TikTok. 16.36.0 has no Amazon Music. `assets/icon-paths.ts` holds each mark's path data, and `assets/icons.tsx` holds `PlatformIcon` (`icon`, `size` in px), which paints it in `currentColor` and is always `aria-hidden`. `assets/icons-source.md` lists each file with its size and SHA-256, the CC0 1.0 licence, the brands' guideline links, and the Amazon stand-in. `platforms.ts` holds the ids in the fixed order (`MAIN_PLATFORMS`, `MORE_PLATFORMS`), each platform's full and short label, and `splitLinks()`. `/system` has an Icons section: the eight platforms and two socials at 22 and 20 px in `--dg-fg`, and at 20 px in the accent. `tests/platforms.test.ts` (18 tests) checks the order, the labels, `splitLinks` (any input order, a missing main platform left out, an empty `more`, only the extras the release has, the first of two links kept, URLs untouched), that every platform and social has a path, the viewBoxes, the one stroked stand-in, `currentColor` with no hex, `aria-hidden` with no title or role, and the source note. Four mutations each failed the right test: the last duplicate winning, no `aria-hidden`, a baked hex fill, and Deezer before Amazon Music. Decisions:
    - **Amazon Music uses the canvas's stand-in**, Reno's pick on 4 Nov 2026: its smile and note, stroked at 1.8 units as drawn. It must be replaced before public launch, and fetching Amazon's mark is a separate ask. The spec, plan.md's risk row and the source note say so.
    - **The marks get 2 units of air** (`viewBox="-2 -2 28 28"`). Simple Icons draws edge to edge on 24 units, while the canvas's line icons leave about 2 units inside the box. Edge to edge, the marks read about 15% larger than the stand-ins at the same size. With the air, a 22 px Spotify ring is 18.9 px across, where the stand-in's is 19.1. The stand-in keeps its own `0 0 24 24`.
    - **The licence was re-checked at download.** None of the nine entries in 16.36.0's `data/simple-icons.json` has a `license` field, so all are under the project's CC0. The downloaded files themselves aren't committed, only their path data.
    - **Path data sits in `icon-paths.ts`, beside `icons.tsx`.** Node's runner can't import `.tsx`, and the tests need the paths. `IconName` covers the eight platforms and the two socials, so `SocialLinks` uses the same component.
    - **Labels follow the canvas:** "Tidal", not the brand's "TIDAL". The short labels are "YouTube" and "Amazon", the rest as the full label.
    - `PlatformIcon`, `IconName`, the platform lists and `splitLinks` are exported from `index.ts`.
  - **Checks.** These ran in headless Brave over the protocol (`phase-6/tools/page-check.mjs` and `ds15-canvas.mjs` in the session notes), against `npm run build` served locally:
    - **360, 768, 1280, 390 and 1440 px:** 30 icons at 22 and 20 px, inside the column. The filled marks compute to `rgb(242, 235, 218)` and the amber ones to `rgb(255, 178, 63)`, and the stand-in's stroke follows the same two colours. No horizontal scroll, and no console problems.
    - **Accessibility tree:** the Icons section shows its headings, lists and items only. No icon is exposed.
    - **`/`:** none of the 11 files it loads holds an icon path or an Icons class.
    - **Keyboard:** Tab still makes 9 stops. DS-15 adds no focusable element.
    - **Reduced motion:** 0 animations, against 5 without it, as before.
    - **Canvas:** the stand-ins from `Main.dc.html`'s bar, More row and header (the same drawings as `PhoneMore.dc.html`) were set beside the built marks at 22 px, at 390 px wide. Ink boxes, built against canvas: Spotify and YouTube Music 18.9 against 19.1 px, SoundCloud 18.9 × 8.4 against 18.3 × 10.8, Bandcamp 18.9 × 10.6 against 17.2 × 10.8, Tidal 18.9 × 12.6 against 18.1 × 12.6, Instagram 18.9 against 17.2. The side-by-side is `ds15-strip.png` in the session scratchpad.
    - **Not checked:** headed Brave, Safari and a real phone. The board itself wasn't opened in the built-in pane: its markup was rebuilt from the source.
  - **Canvas drift, for Checkpoint 6:**
    - **The real marks are filled,** so they read heavier than the canvas's 1.8-unit line drawings. That's the intended change of shape.
    - **Apple Music, Deezer and TikTok stand taller** than their stand-ins: 18.9 px against 15.9, 11.6 and 14.9. Apple's mark is a rounded square, Deezer's is now a heart, and TikTok's note is tall.
    - Amazon Music is still the stand-in.
  - **Depends on:** DS-14
  - **Files:** `src/design-system/assets/icons.tsx`, `src/design-system/assets/icons-source.md`, `src/design-system/platforms.ts`, `tests/platforms.test.ts`, `src/app/system/sections/IconsSection.tsx`. Also `src/design-system/assets/icon-paths.ts`, `src/app/system/system.module.css`, `src/design-system/index.ts`, `src/app/system/page.tsx` and plan.md's risk row
  - **Size:** M

- [ ] **DS-16: `StreamLinks`**
  - The five main platforms as equal buttons in the fixed order, and Amazon Music, Deezer and Tidal behind "More". "More" is a `<button aria-expanded>` with `defaultOpen`, and only renders when there's an extra. It takes a `heading` ("Stream full track", "Stream it on", …), so the "More" toggle can sit on the heading row, as on the canvas.
  - Layouts, as settled by G3:
    - `bar`, below 768 px: a 5-column grid, each button with the icon over the short label, and the extras in a 3-column row underneath
    - `bar`, from 768 px: icon and label inline, 44 px tall
    - `chips`: wrapping text chips, 44 px tall, with "More" as the last chip
  - `emphasis` fills the bar buttons amber for the ended state. Links open in a new tab with `rel="noopener"`.
  - **Acceptance:**
    - at 360 px the five bar buttons fit in one row at 44 px or more (about 62 px wide), with no overflow
    - a platform the release isn't on is left out, not disabled
    - Enter and Space toggle "More", and focus stays on the toggle
    - every link has an accessible name that includes the platform
  - **Verify:**
    - the `/system` states: the five only, all eight with "More" closed and open, one of the five missing, emphasised
    - a keyboard check of the disclosure
    - **Canvas:** the bar layout against `PhonePlaying.dc.html`, `PhoneEnded.dc.html` and `PhoneMore.dc.html` at 390 px, and `HomeDesktop.dc.html` at 1440 px. The chips against the hero on `Main.dc.html` and `PhoneHeroEP.dc.html` at 390 px, and `DesktopHeroes.dc.html` at 1440 px. The chips are 44 px, not the canvas's 36 px
  - **Depends on:** DS-15, and G3 answered
  - **Files:** `src/design-system/components/StreamLinks/*`, `src/app/system/sections/LinksSection.tsx`
  - **Size:** M

- [ ] **DS-17: `SocialLinks`**
  - Instagram and TikTok, in three variants:
    - `icons`: 44 px icon targets, named "Instagram" and "TikTok"
    - `handles`: the icon plus "@thesamegatsby" in VT323, named "Instagram: @thesamegatsby"
    - `footer`: the "Follow the signal" block, two outlined 44 px buttons with icon and name
  - **Acceptance:**
    - every link has an accessible name and `rel="noopener"`, and opens in a new tab
    - targets are 44 px or more
    - the focus ring is visible on each
  - **Verify:**
    - Tab through the three variants
    - **Canvas:** the header icons on `Main.dc.html` and the footer on `HomePhoneFull.dc.html` at 390 px. The header handles on `HomeDesktop.dc.html` at 1440 px
  - **Depends on:** DS-15
  - **Files:** `src/design-system/components/SocialLinks/*`, `src/app/system/sections/LinksSection.tsx`
  - **Size:** S

- [ ] **DS-18: `SiteHeader`**
  - Sticky to the top, with `Wordmark` (`l`) on the left and `SocialLinks` on the right: icons below 768 px, handles from 768 px. Two variants:
    - `floating` (the default): a box inset 10 px on a phone and 12 px from the top on desktop, with a 12 px radius, `.dg-glass`, a `--dg-line` border and the floating shadow, at the heights from the tokens
    - `bar`: full width with a bottom hairline

    It stays in flow, so the page reserves its height. This task also adds `SystemFrame`, the fixed-height, self-scrolling `/system` frame with `contain: layout paint`, so the header can be shown at the top and mid-scroll.
  - **Acceptance:**
    - at 360 px the wordmark and both icons fit one row, with no overflow
    - mid-scroll, the grid and content scroll visibly behind the glass
    - with `backdrop-filter` disabled, the box is solid `--dg-surface`
    - nothing on the page loads hidden beneath it
    - with 4× CPU throttling, scrolling under the header while the grid drifts shows no long frames
  - **Verify:**
    - both variants at the top and mid-scroll, at 360, 768 and 1280 px
    - a performance trace
    - **Canvas:** `Main.dc.html` at 390 px, floating, and with Tweaks › header set to bar. The header on `HomeDesktop.dc.html` at 1440 px. Inset, height, radius, blur, border, shadow, wordmark size and icon/handle spacing match
  - **Depends on:** DS-8, DS-10, DS-17
  - **Files:** `src/design-system/components/SiteHeader/*`, `src/app/system/SystemFrame.tsx`, `src/app/system/SystemFrame.module.css`, `src/app/system/sections/HeaderSection.tsx`
  - **Size:** M

### Checkpoint 6: Links and header
- [ ] The header, in both variants, at the top and mid-scroll, matches `Main.dc.html` and `HomeDesktop.dc.html`
- [ ] Drift from the canvas is listed

---

## Phase 7: Discography

- [ ] **DS-19: `TrackRow`**
  - The whole row is one `<button>` with `aria-pressed`, labelled "Play {title} snippet" or "Stop {title} snippet". The states are idle, loading, playing and played.
  - When playing, the number becomes the sparkle, the time column shows the elapsed time ("00:12") from `elapsed`, and the ring fills amber with a stop square. When played, the time reads "END". Loading isn't drawn on the canvas, so it uses the readout's load glyph in the time column.
  - Variants, as settled by G4:
    - `nested`: indented under an expanded release, on the translucent surface
    - `list`: the hero tracklist, with an optional LEAD tag
  - **Acceptance:**
    - the label switches between "Play …" and "Stop …"
    - the whole row is the hit area, 44 px or more
    - at 360 px a long title truncates without pushing the time or the ring off the row
    - switching states causes no layout shift (fixed column widths)
  - **Verify:**
    - the `/system` states for both variants at 360 px
    - **Canvas:** nested rows in the expanded EP on `Main.dc.html` at 390 px and `HomeDesktop.dc.html` at 1440 px. List rows on `PhoneHeroEP.dc.html` and `PhoneHeroAlbum.dc.html` at 390 px, and `DesktopHeroes.dc.html` at 1440 px
  - **Depends on:** DS-9, DS-12, DS-14, and G4 answered
  - **Files:** `src/design-system/components/TrackRow/*`, `src/app/system/sections/DiscographySection.tsx`
  - **Size:** M

- [ ] **DS-20: `ReleaseRow`**
  - **A single** is one `<button aria-pressed>` that plays. It holds:
    - the cover at a fixed 56 px (60 px on desktop)
    - the title
    - a meta line: "SINGLE", "PLAYING 00:09" with the sparkle, or "PLAYED"
    - "0:30" and the play/stop ring

    While playing, the row sits on the raised surface, with an amber title and cover outline.
  - **An EP or album** is one `<button aria-expanded>` labelled "Show/Hide {title} tracks", with "EP · 2 TRACKS" meta and a chevron ring. Desktop adds the "Show tracks" / "Hide tracks" text. Expanded, it renders its nested `TrackRow`s and sticks inside its own release group, at `top: var(--dg-sticky-release)` on opaque `--dg-surface`. Collapsed releases and singles never stick.
  - Remix and edit tags use the hazard outline. Stream links are never inside the row button.
  - **Acceptance:**
    - the tags show on remix and edit releases
    - at 360 px a long title truncates cleanly
    - the cover has fixed dimensions (CLS 0)
    - the sparkle marks the playing row, including a playing nested track
  - **Verify:**
    - the `/system` states at 360 px
    - Lighthouse CLS on `/system`
    - **Canvas:** the full discography on `Main.dc.html` at 390 px (EP expanded, plus `PhonePlaying.dc.html` for a playing single). The discography on `HomeDesktop.dc.html` at 1440 px
  - **Depends on:** DS-19
  - **Files:** `src/design-system/components/ReleaseRow/*`, `src/app/system/sections/DiscographySection.tsx`
  - **Size:** M

- [ ] **DS-21: `ReleaseFilter`**
  - **Below 768 px:**
    - "Show" plus a trigger reading "All releases 8 ▾", with `aria-haspopup="listbox"` and `aria-expanded`
    - it opens a `listbox` of 48 px `option`s with counts, the selected one ticked in amber
    - Arrow keys move through the options, Enter picks one, and Escape closes the list
    - picking filters and closes the list, and focus returns to the trigger
    - the "Discography · 30 SEC SNIPPETS" heading sits above the box
  - **From 768 px:**
    - a `role="group"` row of buttons with counts, the selected one filled amber (`aria-pressed`)
    - the heading sits inside the box
  - Both shapes render, and CSS shows one. The box is contained (`.dg-glass`, border, 12 px radius, floating shadow, inset 10 px on a phone) and sticks at `top: var(--dg-sticky-filter)`. The options come from `releaseFilterOptions`, and `defaultOpen` shows the open state on `/system`.
  - **Acceptance:**
    - the keyboard pattern works, and so do mouse and touch
    - a type with no releases is left out (shown with a fixture that has no albums)
    - targets are 44 px or more (the canvas's desktop buttons are 40 px)
    - from 768 to 1023 px the desktop row keeps a fixed height and doesn't wrap, so the offsets below it hold
  - **Verify:**
    - a keyboard-only pass in the built-in browser
    - a check at 768 px
    - **Canvas:** `PhoneFilter.dc.html` (open) and `Main.dc.html` (closed) at 390 px. The filter row on `HomeDesktop.dc.html` at 1440 px
  - **Depends on:** DS-14
  - **Files:** `src/design-system/components/ReleaseFilter/*`, `src/app/system/sections/DiscographySection.tsx`
  - **Size:** M

- [ ] **DS-22: The sticky stack, assembled on `/system`**
  - `SiteHeader`, `ReleaseFilter` and the release list composed in a phone-width `SystemFrame` and a desktop-width one. The list has the [bracketed] eight-track album and the EP expanded, so the hand-off can be seen. Each layer's `top` comes from the token sums. Whatever breaks gets fixed in the components' CSS.
  - **Acceptance:**
    - mid-scroll at 360, 768 and 1280 px, the stack has no gap or overlap: the header, then the filter 6–8 px below it, then the expanded release row
    - the expanded row leaves with its last track, and the next expanded release takes its place
    - nested tracks scroll under the release row, on the translucent surface
    - with every release collapsed, only the header and filter stick
  - **Verify:**
    - scroll each frame in the built-in browser, with screenshots mid-scroll and at the hand-off
    - **Canvas:** `PhoneSticky.dc.html` at 390 px (the filter and the [Album] row stuck). Scroll `HomeDesktop.dc.html` at 1440 px and compare
  - **Depends on:** DS-18, DS-20, DS-21
  - **Files:** `src/app/system/sections/StickyStackSection.tsx`, `src/design-system/tokens.css` (offset fixes), and the module CSS of `SiteHeader`, `ReleaseFilter` and `ReleaseRow` if they need fixes
  - **Size:** M

### Checkpoint 7: Reno scrolls the sticky stack on a phone
- [ ] Pushed to the preview (🔒 push). If CF-4 isn't done yet, I serve it from the laptop on the local network instead
- [ ] Reno has scrolled the stack on a real phone
- [ ] Changes are either done or recorded in the spec

---

## Phase 8: Hero and player

- [ ] **DS-23: `ReleaseHero`**
  - A label row with the sparkle in amber: "New single", "New EP · 2 tracks" or "New album · N tracks".
  - The cover at 350 px on a phone and 440–480 px on desktop, with the large radius, a hairline border and the cover glow, and nothing over it.
  - The Aero title with `.dg-tape`, at the hero size.
  - **A single** gets the "Play snippet" primary button and "Stream it on" chips.
  - **An EP or album** gets:
    - "Play lead track", with the lead title as a readout beside it
    - "On this EP" or "On this album", with `TrackRow` `list` rows and LEAD on the lead track
    - "Stream the EP" or "Stream the album" chips

    An album shows its first five tracks and a "Show all N tracks" disclosure.
  - From 768 px it's two columns, with the cover on the left. The playing state follows G7.
  - **Acceptance:**
    - single, EP and album render at 360 and 1280 px
    - the playing state is shown
    - "Show all" toggles `aria-expanded` and reveals every track
    - the cover keeps its aspect ratio (CLS 0)
    - the title wraps without overflow at 360 px
    - there's no text or filter on the cover
  - **Verify:**
    - the `/system` states at 360, 768 and 1280 px
    - Lighthouse CLS
    - **Canvas:** the single hero on `Main.dc.html` at 390 px and `HomeDesktop.dc.html` at 1440 px. `PhoneHeroEP.dc.html` and `PhoneHeroAlbum.dc.html` at 390 px. `DesktopHeroes.dc.html` at 1440 px
  - **Depends on:** DS-9, DS-11, DS-16, DS-19, and G7 answered
  - **Files:** `src/design-system/components/ReleaseHero/*`, `src/app/system/sections/HeroSection.tsx`
  - **Size:** M

- [ ] **DS-24: `NowPlayingBar`**
  - Fixed to the bottom, with `ProgressTape` along its top edge and scanlines over the bar but beneath the cover thumbnail. It holds the cover, the title (type per G1), `VhsReadout`, a `hardware` stop button, and `StreamLinks` (`bar`).
  - **Ended** (per G5):
    - the readout reads END
    - stop gives way to Replay and Close
    - the heading turns to "Hear the full track" with the sparkle
    - the five buttons fill amber
  - **Layout:** below 768 px it's two rows, with the cover, title, readout and stop first, then the heading with "More", the five buttons and the extras. From 768 px it's one row.
  - It respects `env(safe-area-inset-bottom)`. It reserves its own height with an in-flow spacer that tracks the bar's size, so an open "More" row counts. A polite live region announces "Playing {title}" and "Snippet ended", never the ticking time.
  - **Acceptance:**
    - in a `SystemFrame` per state, the last content scrolls fully clear of the bar at every width
    - at 360 px it shows two rows, and every target is 44 px or more
    - the ended state stays up, with the stream links emphasised
    - stop, replay, close and "More" are all reachable by keyboard
    - the scanlines never cover the thumbnail
  - **Verify:**
    - the loading, playing, ended and "More" states at 360, 768 and 1280 px
    - a phone-sized emulation with a bottom safe-area inset
    - **Canvas:** `PhonePlaying.dc.html`, `PhoneEnded.dc.html` and `PhoneMore.dc.html` at 390 px. The bar on `HomeDesktop.dc.html` at 1440 px
  - **Depends on:** DS-11, DS-12, DS-13, DS-16, and G5 answered
  - **Files:** `src/design-system/components/NowPlayingBar/*`, `src/app/system/sections/PlayerSection.tsx`
  - **Size:** M

### Checkpoint 8: Reno reviews every component
- [ ] Pushed to the preview (🔒 push), with the URL shared
- [ ] The list of remaining drift from the canvas is shared with it
- [ ] Reno has checked `/system` on a real phone
- [ ] Changes are either done or recorded in the spec

---

## Phase 9: Hardening

- [ ] **DS-25: Acceptance pass against SPEC-design-system.md and the canvas**
  - Go through every acceptance box in the spec, and every reference board one last time, fixing what fails. Record the measured numbers: font KB, `/system` Lighthouse, JS on `/`.
  - **Acceptance:**
    - every box in SPEC-design-system.md's acceptance criteria is ticked, each with its evidence noted
    - every reference board in plan.md has been compared, with no unlisted drift
  - **Verify:**
    - `npm run ci`
    - built-in browser checks at three widths, by keyboard, with reduced motion
    - Lighthouse via DevTools on the preview URL
    - **Canvas:** every board in plan.md's reference table, at its own width
  - **Depends on:** DS-22, DS-23, DS-24
  - **Files:** whatever fails, plus `SPEC-design-system.md` (tick the boxes)
  - **Size:** S–M

### Checkpoint 9: design-system complete
- [ ] SPEC-design-system.md's acceptance criteria are all met, with evidence
- [ ] Next step: write `SPEC-media-pipeline.md` for review

---

## Deferred until `site` is built

- [ ] **CF-5: Cutover**, done at a quiet hour as phase 4 of the infra spec, with `scripts/check-edge.sh site` and the downtime loop
- [ ] **CF-6: Settle.** 14 days on Cloudflare, then Reno removes the domain from Vercel and disconnects it
