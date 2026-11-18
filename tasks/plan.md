# Implementation Plan: design-system + cloudflare-infra

Covers the first step of the build order in [SPEC.md](../SPEC.md): [`design-system`](../SPEC-design-system.md) and [`cloudflare-infra`](../SPEC-cloudflare-infra.md), built in parallel. The task checklist is [todo.md](todo.md).

Revised on 3 Nov 2026, after Reno approved the screens at Checkpoint 0.

## Overview

By the end of this plan:
- the repo runs on Next.js 16 as a static export, with checks that gate every deploy
- Déjà Gatsby's tokens, fonts, textures (including the drifting grid backdrop and the glass surface), assets and all 14 components in SPEC-design-system.md exist, each shown in every state on `/system` and matched against the approved canvas
- the three sticky layers (header, filter, expanded release) work together on `/system` at phone and desktop widths
- the domain's DNS is on Cloudflare
- the R2 media domain caches and serves CORS headers correctly
- every push to `redesign` produces a Cloudflare preview URL

**Update, 4 Nov 2026:** Reno deleted the Vercel site, so there is no production until launch, and `www` points at nothing until then. **Launch (CF-5) waits until `site` is built**, because until then there's nothing to launch.

## The canvas is the visual reference

The approved canvas, ["Déjà Gatsby Screens"](https://claude.ai/artifact/WSB4B7NtCYipXV3GSXmmSo), is what every UI task has to look like. SPEC-design-system.md is the contract for behaviour, accessibility and tokens.

Every UI task's verification includes a side-by-side check against the boards that task names:
- Open the board on the canvas and `/system` in the built-in browser, at the board's own width: 390 px for phone boards, 1440 px for desktop boards.
- Compare layout, spacing, sizes, colour, type and every state the board shows.
- Fix any drift, or list it for the next checkpoint, where Reno accepts it or not.

This comes on top of the spec's own checks at 360, 768 and 1280 px.

| Board | What it shows | Reference for |
|---|---|---|
| `Main.dc.html` | The clickable phone home. Its Tweaks switch the mode (idle, playing, ended, more, sticky, filter open), the header (floating or bar) and the bracketed example releases | Header, single hero, filter, release and track rows, player bar, footer socials, backdrop |
| `HomePhoneFull.dc.html` | The whole phone page, top to footer (a view of `Main`) | Page rhythm, footer block |
| `HomeDesktop.dc.html` | The desktop home with a snippet playing | Desktop header with handles, desktop single hero, filter buttons, discography rows, one-row player bar |
| `PhoneSticky.dc.html` | Phone mid-scroll, with the filter and an expanded album stuck | The three sticky layers |
| `PhoneFilter.dc.html` | The phone filter dropdown, open | `ReleaseFilter` below 768 px |
| `PhoneHeroEP.dc.html`, `PhoneHeroAlbum.dc.html` | EP and album heroes on a phone | `ReleaseHero`, hero tracklist rows, hero stream links |
| `DesktopHeroes.dc.html` | An EP hero, then an album hero, on desktop | `ReleaseHero` from 768 px |
| `PhonePlaying.dc.html`, `PhoneEnded.dc.html`, `PhoneMore.dc.html` | Player bar states on a phone (views of `Main`) | `NowPlayingBar`, `StreamLinks` in the bar, `VhsReadout`, `ProgressTape` |
| `StyleTile.dc.html` | Colours, type, motifs, textures, buttons, rows | Tokens, textures, `SparkleStar`, `Button` |
| `WordmarkVariants.dc.html` | Wordmark variations, with V5 chosen and V7 for artwork | `Wordmark` |

The options Reno didn't pick aren't references: Socials B and C, Groupings B and C, the glow background, and every wordmark variant other than V5 and V7. Socials A and Grouping A were chosen, and they're already built into the boards above.

### Where the canvas and the spec disagree, the spec wins

These are the known cases:
- **Grain.** The canvas uses 9% with a screen blend. The spec caps grain at 8% (`--dg-grain-opacity: 0.07`, normal blending, chosen in DS-7), so the built page will look slightly cleaner.
- **Grid fade.** The boards fade the grid from 85% to 70%, top to bottom (80% to 65% on desktop). The spec keeps it even, as approved at Checkpoint 0.
- **Vignette stacking.** The phone board draws the vignette under the header and the bar. The spec makes grain and vignette one layer over everything, so on phones the header's top corners darken slightly, and the bar's bottom corners more (27% at the corner, on grey). From 768 px there's no vignette, as on the desktop board.
- **Touch targets.** On the canvas the phone hero stream chips are 36 px tall, the desktop filter buttons 40 px, and the bar's "More" toggle 32 px. All are built at 44 px or more.
- **Scanlines.** The canvas lays them over the bar's cover thumbnail. The spec says never over cover art, so they sit beneath it.
- **"More" in the hero.** On the canvas it's a plain link, and it's missing from the phone single hero. Per the spec, it's a disclosure button, shown whenever the release has an extra platform.
- **Colours.** The boards hard-code hex and rgba values. The build uses tokens only.
- **Hero title size.** `HomeDesktop.dc.html` draws the single's title at up to 72 px, and `DesktopHeroes.dc.html` draws the EP and album titles at up to 64 px. The single `display-xl` token gives 72 px at 1440 px for both.
- **Small type.** The canvas uses 13 px chips and 9–10 px tags. The built page uses `--dg-text-small` (14 px) for chips and `--dg-text-label` (12 px) for tags.

## Canvas details the spec doesn't cover yet

Reading the boards against SPEC-design-system.md turned up details that are drawn but not specified, or specified differently.

**Resolved on 3 Nov 2026.** Reno approved these recommendations together with the plan, and they're now in SPEC-design-system.md. That keeps to the rule from Checkpoint 0: spec first, then code. The table stays here as the record of why the spec changed.

| # | The canvas | The spec | Recommendation | Needed before |
|---|---|---|---|---|
| G1 | **Type sizes.** In Aero, the header wordmark is 28 px on a phone and 36 px on desktop, and hero titles are 30 → 72 px. Row titles are 14–16 px, readouts 18–22 px and tags 9–10 px. The now-playing title is Chakra Petch at every width | `display-l` is 28 → 48 px and `display-xl` 44 → 96 px. `text-title` is 18 px, there's one readout size (20 px), and the smallest type is 12 px. The now-playing title is Aero from 768 px | Retune the tokens to the approved screens. `display-l` becomes 28 → 36 px (the wordmark in the header and footer), and `display-xl` becomes 30 → 72 px (hero titles). Add a smaller title size and an 18 px readout size for rows. Tags use the 12 px label size. Keep the now-playing title in Chakra Petch, as drawn | DS-4 |
| G2 | **Buttons.** The primary "Play" button is amber with the cut corner. Stop and replay are square outlined icon buttons, and ghost is an outline | The chamfer is for `hardware` buttons | `primary` is amber with the cut corner, `ghost` is the outline, and `hardware` is the square icon button (stop, replay, close) | DS-11 |
| G3 | **Stream links.** They look two ways: wrapping text chips in the hero ("Stream it on"), and icon buttons in the player bar | One `StreamLinks`, with an icon on every button | Add `variant: chips \| bar`. Chips stay text-only, as drawn, at 44 px | DS-16 |
| G4 | **Live time on rows.** A single's row reads "PLAYING 00:09", then "PLAYED". A track's time column reads "00:12", then "END". Hero tracklists use a LEAD tag and a row that isn't indented | `TrackRow` has `state` only, with no `elapsed` and no lead tag. `ReleaseRow` takes `playingTrackId` only | Add `elapsed` to both, `lead?` to `TrackRow`, and `variant: nested \| list` for the two row layouts | DS-19 |
| G5 | **The ended bar** swaps stop for Replay and Close. Its heading becomes "Hear the full track" with a star, and the five buttons fill amber | `onStop` only. Ended has "stream emphasised" | Add `onReplay` and `onClose` | DS-24 |
| G6 | **Filter counts.** A single whose track is a remix or edit counts under "Remixes & edits", not "Singles" | Silent on how releases are counted | Follow the canvas. An EP or album stays under its own type, even if it holds a remix | DS-14 |
| G7 | **The hero's playing state** isn't drawn | `ReleaseHero` lists "playing" as a state | The playing track's row takes the playing look, and the main button turns to "Stop snippet". Reno sees it at Checkpoint 8 | DS-23 |

No decision is needed for one more thing: the canvas uses values the token tables don't list yet. They are the floating-box and bar shadows, the cover and readout glows, the glass blur (with `saturate(1.2)`), the grid's line strength, and the sticky-stack heights and insets. I read them off the boards and record them in the same spec edit.

## Architecture decisions

- **One integration branch, `redesign`.** One commit per task, in conventional-commit style. `main` doesn't move until launch. Once CF-4 is done, every push to `redesign` gets a Cloudflare preview URL you can open on your phone.
- **`/system` is the test bench.** Every component is built and checked there in every state, with no Storybook or other extra tooling. `claude-design-system` also publishes from it later.
- **Components take view props, never data sources.** `src/design-system/types.ts` defines the release, track, stream-link and social shapes the components render. `media-pipeline`'s catalogue types arrive later, and `site` maps them onto these shapes. The design system imports neither the catalogue nor `audio-engine`.
- **Testable logic lives in `.ts` files.** Node's type stripping can't run JSX, so `node --test` can't import `.tsx`. Time formatting, contrast, filter counts and platform order are plain `.ts` with tests, and the components stay thin.
- **One breakpoint, 768 px.** It's written as a literal in each media query, because custom properties don't work in media queries. Where a component changes shape at 768 px, like the filter, both shapes render and CSS shows one. That needs no JavaScript media query and causes no hydration flash.
- **The sticky stack is computed in CSS.** The header and filter heights and insets are tokens, and each layer's `top` is a `calc()` of the layers above it. Nothing measures in JavaScript. No ancestor of a sticky element may set `overflow: hidden`, so `Screen` clips horizontal overflow with `overflow-x: clip` instead.
- **Disclosure state lives in the component**, with a `defaultOpen` prop, so `/system` can show open states (the filter list, "More", the album's "Show all") without scripting.
- **`/system` shows fixed and sticky components in frames.** A `SystemFrame` is a full-width, fixed-height box that scrolls on its own and sets `contain: layout paint`, which makes it the containing block for fixed elements. The player bar and the sticky stack then render inside it, one frame per state, instead of piling up at the bottom of the viewport.
- **One-off font work happens outside the repo.** fonttools runs in a virtual environment outside the repo, at `~/.local/share/venvs/dejagatsby-fonttools`, for subsetting in DS-5 and outlining the wordmark in DS-10. Session scratchpads don't outlive their session, so it isn't kept in one. Only the resulting WOFF2 files, SVG path data and licence texts are committed, so the repo gains no Python dependency.
- **Grain: an SVG noise tile, inline in `textures.css`.** It's the canvas's own `feTurbulence` tile, under 1 KB, with no image tooling. DS-7 checked it in WebKit and Chromium, and with 4× CPU throttling, so the AVIF fallback wasn't needed. The spec says so.
- **The wordmark is inline SVG, outlined from Aero's own glyphs.** It's three copies of one path:
  - hazard at 55%, offset 0.06em × 0.08em
  - ultramarine, offset 0.03em × 0.04em
  - bone on top

  The fills come from tokens, so the V5 look has one source. The logo renders before the font loads and can't fall back to a different typeface. `assets/wordmark.svg` is exported with the colours baked in, for `release-kit` and the Claude Design System.
- **The edge checks are a script** (`scripts/check-edge.sh`), so the cache, range, CORS and redirect checks can be re-run after every Cloudflare change and again at cutover.

## Dependency graph

```
Foundation     DS-1 → DS-2 → DS-3
The look       DS-2 → DS-4 → DS-5 → DS-6                       (DS-4 also waits on G1)
Surfaces       DS-6 → DS-7 → DS-8
Primitives     DS-6 → DS-9 · DS-11 · DS-12 → DS-13 · (DS-5 + DS-6) → DS-10
Links, header  DS-6 → DS-14 → DS-15 → DS-16 · DS-17
               DS-8 + DS-10 + DS-17 → DS-18
Discography    DS-9 + DS-12 + DS-14 → DS-19 → DS-20
               DS-14 → DS-21
               DS-18 + DS-20 + DS-21 → DS-22
Hero, player   DS-11 + DS-16 + DS-19 → DS-23
               DS-11 + DS-13 + DS-16 → DS-24
Hardening      everything → DS-25
Edge path      CF-1 → CF-3 ·  DS-2 → CF-2 → CF-4
```

The tasks run one at a time on `redesign` in the order listed, even where the graph would allow parallel work: every component task adds a line to the same `index.ts` and `/system` page.

## Task list

### Phase 0: Screens for approval ✓
- DS-0: Mock up the redesign on the canvas. **Approved by Reno on 3 Nov 2026.**
- Before DS-1: G1–G7 folded into SPEC-design-system.md. **Done on 3 Nov 2026.**

### Phase 1: Foundation
- DS-1: Upgrade to Next.js 16 with the App Router, exported as static files
- DS-2: Check scripts and repo hygiene
- DS-3: Project `CLAUDE.md`

**Checkpoint 1:** `npm run ci` passes and the placeholder homepage renders.

### Phase 2: The look (put early so a wrong direction is caught fast)
- DS-4: Tokens, with contrast and no-stray-values tests
- DS-5: Fonts
- DS-6: The `/system` route and its tokens section

**Checkpoint 2: Reno compares `/system` against the style tile.** The look was signed off at Checkpoint 0. This check catches anything lost moving from mockup to real fonts and tokens.

### Phase 3: Edge path (runs alongside phases 4–8)
- CF-1: Move the zone to Cloudflare as DNS only, and switch the nameservers. **This can start right now.** It has no code dependency, and propagation is the slowest step in the whole plan.
- CF-2: Local Worker config and `cf:dev`
- CF-3: Media bucket, zone settings, rules and a probe object, checked with `check-edge.sh`
- CF-4: Workers Builds connected to GitHub, with a preview URL for `redesign`

**Checkpoint 3:** the preview URL serves `/system`, `check-edge.sh` passes for media, and `www` still points at nothing.

### Phase 4: Surfaces
- DS-7: Textures, the glass surface and `Screen`
- DS-8: The drifting grid backdrop

**Checkpoint 4:** the bare page matches the canvas backgrounds, and there are no long frames at 4× CPU throttling.

### Phase 5: Primitives
- DS-9: `SparkleStar`
- DS-10: `Wordmark`
- DS-11: `Button`
- DS-12: `VhsReadout`
- DS-13: `ProgressTape`

**Checkpoint 5:** these are on `/system` in every state, matched against the style tile and the wordmark board.

### Phase 6: Links and header
- DS-14: View types, the `/system` fixture and filter options
- DS-15: Platform and social icons
- DS-16: `StreamLinks`
- DS-17: `SocialLinks`
- DS-18: `SiteHeader`

**Checkpoint 6:** the header, in both variants, matches the phone and desktop boards, at the top and mid-scroll.

### Phase 7: Discography
- DS-19: `TrackRow`
- DS-20: `ReleaseRow`
- DS-21: `ReleaseFilter`
- DS-22: The sticky stack, assembled on `/system`

**Checkpoint 7: Reno scrolls the sticky stack on a real phone.** It's the newest and most fiddly behaviour, so it gets a look before the last two components.

### Phase 8: Hero and player
- DS-23: `ReleaseHero`
- DS-24: `NowPlayingBar`

**Checkpoint 8: Reno reviews every component on the preview URL, on a real phone**, along with the list of any remaining drift from the canvas.

### Phase 9: Hardening
- DS-25: Acceptance pass against SPEC-design-system.md and the canvas

**Checkpoint 9:** every acceptance box in SPEC-design-system.md is ticked. Next comes writing `SPEC-media-pipeline.md`.

### Deferred until `site` is built
- CF-5: Launch. CF-6, the 14 days on Vercel as a fallback, was dropped when Vercel was deleted

## Approvals I'll ask for, in order

Nothing here happens without a yes at the time.

| When | What |
|---|---|
| DS-1 | Creating the `redesign` branch, and installing the new npm dependencies (Next 16, React 19, ESLint 9 and their peers) |
| DS-5 | Creating a scratch Python venv with fonttools and brotli from PyPI (DS-10 reuses it). Downloading Chakra Petch and VT323 (OFL) from the `google/fonts` GitHub repo |
| DS-15 | Downloading 8 platform and 2 social icon SVGs from Simple Icons (CC0) |
| CF-1 | You adding the zone in Cloudflare's dashboard and changing the nameservers at Host Africa. I give you the exact steps and check each one |
| CF-2 | Adding `wrangler` as a dev dependency |
| CF-3 | `wrangler login` (you approve the OAuth in your browser), creating the bucket, connecting the media domain, the zone settings and rules, and uploading one probe file |
| CF-4 | You connecting the GitHub repo in Workers Builds, and me pushing `redesign` |
| Checkpoints 7 and 8 | Pushing `redesign` so you can review the preview on your phone |

The fixture covers are made with macOS's built-in `sips` and `qlmanage`, so they need no download or install.

## Risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Aero's licence isn't confirmed by launch | High: blocks public launch | Pay and email the designer now, since replies can take a while. Building carries on in the meantime |
| The glass blur over a constantly moving grid is costly on mid-range phones, because the blur has to redraw every frame | Medium | DS-8 tests a plain glass box over the drifting grid at 4× CPU, before any header exists. Fallbacks, in order: a slower drift, a static grid behind the sticky boxes only, then solid `--dg-surface` boxes. **DS-8 found no long frames, so none is in use.** A real phone is still unchecked |
| `clip-path` on the chamfered primary button clips its focus outline | Medium: an invisible focus ring fails the spec | Draw the chamfer on an inner layer, so the button's own outline isn't clipped. DS-11 checks the ring by keyboard |
| A `position: sticky` layer stops sticking because an ancestor sets `overflow: hidden` | Medium | `Screen` uses `overflow-x: clip`. DS-22 checks all three layers at three widths |
| The desktop filter row wraps between 768 and 1023 px, changing its height and breaking the offsets below it | Medium | The row has a fixed height, and its buttons scroll sideways inside the box if they must. DS-21 checks at 768 px |
| The canvas can't be opened in the built-in browser (a claude.ai sign-in) | Low | Compare against the board sources' sizes and colours, read with the Artifact tool. Reno checks by eye at the checkpoints |
| Simple Icons doesn't carry every platform, Amazon Music in particular | Low | Check its list before downloading. If one is missing, the brand's own press-kit mark is a separate ask. **DS-15 found Amazon Music missing from 16.36.0. It uses the canvas's stand-in until Amazon's mark is sourced, before launch** |
| Bring That Change's cover is an SVG, which `sips` can't read | Low | Render it with `qlmanage`, then convert it with `sips`. UKG 333 has no cover of its own, so it uses the EP's |
| Fonts go over the 90 KB budget | Medium | Subset tighter, or swap Chakra Petch 600 for 500 and check how titles look |
| VT323 lacks `▶■◌` | Low | Draw them as SVG glyphs, as the spec already allows (the canvas does this too) |
| The nameserver change is slow, or Host Africa's panel is awkward | Medium: delays CF-3 | Start CF-1 first. Nothing in `design-system` waits on it |
| The Transform Rule's CORS header doesn't reach cached R2 responses | Medium: would break the release kit's export | `check-edge.sh` tests exactly this. Fallback: an R2 CORS policy plus a purge of the media host |
| A `wrangler deploy` from `redesign` would try to claim `www` through the `routes` in `wrangler.jsonc` | Medium | Only `main` runs `wrangler deploy`, and `main` doesn't get `wrangler.jsonc` until cutover. I never run `wrangler deploy` by hand |
| Workers Builds ignores `.node-version` | Low | Set a `NODE_VERSION` build variable instead |
| Removing Chakra leaves `/` as a bare placeholder on `redesign` | Low | It's intended. Production is on `main`, which doesn't move |

## Open questions

1. **Can CF-1 start now, before any code?** It changes nothing visible, because the same records answer from Cloudflare's nameservers. It's the slowest step, so starting it early stops it from holding up CF-3 later.

## Size and cost

There are 29 tasks up to the preview URL: 25 for design-system and 4 for infra. All are small or medium. Cutover (CF-5, CF-6) gets planned together with `site`.

That's many sessions of work, roughly two or three tasks per session. I stop at every checkpoint. On top of the approvals above, three review stops need you:
- Checkpoint 2, the style tile
- Checkpoint 7, the sticky stack on a phone
- Checkpoint 8, everything on a phone

---

# Implementation Plan: media-pipeline

Planned on 12 Nov 2026 from [SPEC-media-pipeline.md](../SPEC-media-pipeline.md), the next step in SPEC.md's build order. The tasks are MP-1 to MP-11, plus MP-3b for the loudness match added on 14 Nov, in [todo.md](todo.md), Phases 10 and 11. `cloudflare-infra` is done up to launch (CF-1 to CF-4), so the plan doesn't stop for the bucket, as the spec's open question 7 expected it might.

## Overview

By the end of this plan:
- `npm run add-song` turns a WAV master and a cover into a 30 s fast-start snippet and eight cover files, names them by content hash, uploads them, checks the media domain serves them, and only then writes `src/catalogue/songs.json`
- `--dry-run` does everything up to the upload, so Reno can listen and look before anything leaves the Mac
- the five current releases (six tracks) are re-cut from their masters and live on `media.thesamegatsby.com`
- `songs/index.ts` and the 21 MB `public/music/` are gone

## Architecture decisions

- **Pure functions first, tools last.** WAV parsing, the cut, the loudness meter and fades, the MP4 box walk, ids, keys, argument parsing, the catalogue merge and validation are plain `.ts`, tested on Linux in `npm run ci`. `afconvert`, `sips`, `cwebp` and Wrangler sit behind thin wrappers, tested only on the Mac (skipped where `process.platform !== "darwin"`), because Workers Builds has none of them.
- **The risky encode comes early.** MP-5, the real `afconvert` round trip, is the fifth task. If Apple's encoder doesn't give `moov` first and byte-identical output on this Mac as the spec found on 4 Nov, the plan learns that before the CLI is built on it.
- **The orchestrator takes its tools as arguments.** `add-song`'s build → upload → verify → write order is one function that's given its encoder, uploader and checker. The tests pass fakes that fail at each step and check `songs.json` is untouched. Only the entry script wires in the real ones.
- **Fixtures are generated, not committed.** The tests build their WAVs, MP4 boxes and PNGs in code: a 40 s tone and a 1200² test pattern. No audio or art enters the repo.
- **`src/catalogue` stays independent of `design-system`.** It repeats the platform, release-type and track-kind ids, as the spec says. A test checks the two lists match, so they can't drift apart.
- **The old placeholder `/` keeps working throughout.** It moves from `songs/index.ts` to `src/catalogue` only in MP-11, once the catalogue holds the real releases.

## Dependency graph

```
MP-1 catalogue types, validation, URLs ─┬─────────────────────────────┐
MP-2 ids, keys, links ──────────────────┤                             │
MP-3 WAV, cut, fades ──┐                │                             │
MP-3b loudness match ──┤                │                             │
MP-4 MP4 boxes ────────┴─ MP-5 snippet encode (Mac) ─┐                │
                          MP-6 covers (Mac) ─────────┤                │
                          MP-7 arguments, merge ─────┴─ MP-8 add-song --dry-run
                                                              │
                                     MP-9 upload, verify, write, check-media 🔒
                                                              │
                                     MP-10 re-cut the five releases 🔒 👤
                                                              │
                                     MP-11 retire songs/index.ts and public/music/
```

MP-1 to MP-4 don't depend on each other, and MP-6 needs only MP-2. They could run in parallel sessions. In practice they go one at a time, as Phases 5–8 did.

## Task list

### Phase 10: To `--dry-run`
- MP-1: Catalogue types, validation and URL helpers
- MP-2: Ids, keys and link cleaning
- MP-3: WAV read and write, the cut and the fades
- MP-3b: Loudness meter and match, to −14 LUFS with a −1 dBTP cap
- MP-4: MP4 box walk and timestamp zeroing
- MP-5: The snippet encode, on the Mac
- MP-6: Covers, on the Mac
- MP-7: Arguments and the catalogue merge
- MP-8: `add-song --dry-run`, end to end

**Checkpoint 10:** Reno runs `--dry-run` on one real master and cover, listens with `afplay` and looks at the covers in Quick Look.

### Phase 11: Live
- MP-9: Upload, verify, write, and `check-media` 🔒 (the first real upload)
- MP-10: Re-cut the five releases 🔒 👤
- MP-11: Retire `songs/index.ts` and `public/music/`

**Checkpoint 11:** every acceptance box in SPEC-media-pipeline.md is ticked, and Reno has heard every snippet.

## Inputs from Reno

None of these block Phase 10. MP-10 needs them all, and MP-8's checkpoint needs one master and one cover.

| | Input | Needed by |
|---|---|---|
| I-1 | Where the six WAV masters are on the Mac. They never enter the repo | Checkpoint 10 (one), MP-10 (all) |
| I-2 | A start second for each track, auditioned with `--dry-run` | MP-10 |
| I-3 | Each release's date | MP-10 |
| I-4 | The links for all eight platforms per release. I can read them off the public platform pages for him to check | MP-10 |
| I-5 | Give me that KaiZen's real type and tracklist. **Answered 17 Nov:** a single of the original mix only, linking to the platforms' release with both mixes | MP-10 |
| I-6 | Square source art for Give me that KaiZen and Bring That Change, if he has it (otherwise `--crop`, and `sips`'s SVG render) | MP-10 |

## Approvals I'll ask for

| When | What |
|---|---|
| MP-9 | The first real upload: one release, to prove the whole path |
| MP-10 | Each batch of uploads, after Reno has heard the `--dry-run` snippets and seen the covers |

`--dry-run`, the tests and deleting `public/music/` from the repo need no ask. Nothing is installed: `afconvert`, `afinfo` and `sips` ship with macOS, `cwebp` is already installed through Homebrew, and Wrangler came with CF-2.

## Risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| A macOS update changes `afconvert`'s or `sips`'s output, so the same inputs hash differently | Medium: re-runs would make new keys | MP-5 and MP-6 test byte-identical output on two runs. Keys never overwrite, so the worst case is a few orphaned objects. Re-cuts happen rarely, and on purpose |
| `afconvert` stops writing `moov` first | High: slow start, the module's whole point | MP-5 checks it on every Mac test run, and the box walk refuses to stage a file with `mdat` first |
| The first audio frame lands past 16 KB | Medium: the infra spec's range check, and a slower first byte | MP-5 measures it on the test tone, and MP-8 on a real master |
| The home-made loudness meter reads wrong | Medium: songs still mismatched, and at the wrong level beside Spotify | MP-3b checks it against EBU Tech 3341's test signals at 44.1 and 48 kHz, and MP-5 re-measures the decoded snippet. Checkpoint 10 is Reno's ears on a real master |
| Masters at an odd sample rate or bit depth | Low | `afconvert` turns every master into 32-bit float WAV first, so MP-3 only ever reads one format |
| An upload half succeeds | Low | The catalogue is written last. Keys are immutable, so a re-run uploads the same bytes to the same keys |
| Can't You See's grain makes its 1080 AVIF heavy | Medium: the 350 KB first-load budget | AVIF at 50 by default, and `--cover-quality` per release. Reno checks by eye in MP-10 |
| Give me that KaiZen turns out to be several tracks | Low: more tracks to cut | I-5 settles it before MP-10. The catalogue already models EPs and albums |
| The Mac-only tests rot because CI never runs them | Medium | They run in every local `npm test` on the Mac, and each Done note says they ran |

## Size and cost

There are 12 tasks: seven small or medium pure-code tasks, two Mac integration tasks, the CLI, the upload step and the re-cut. At the pace of Phases 5–8, that's two or three sessions plus the re-cut, which mostly waits on Reno's inputs and listening. Each task runs the test-first loop and ends in its own commit on `redesign`.

# Implementation Plan: audio-engine

Planned on 17 Nov 2026 from [SPEC-audio-engine.md](../SPEC-audio-engine.md), which Reno approved that day with all six open questions answered as recommended. It's the next step in SPEC.md's build order. The tasks are AE-1 to AE-8 in [todo.md](todo.md), Phases 12 and 13.

## Overview

By the end of this plan:
- `src/audio/` plays one snippet at a time through one shared `<audio>` element, from a tap, and reports a small state that `site` maps onto the components
- a snippet starts fetching on `pointerdown`, and the hero's lead track's first range is fetched after load
- the lock screen shows the track, Déjà Gatsby and the cover, and offers no skip or seek
- an unlinked `/bench` page measures tap to `playing` on the deployed preview, and Reno checks it on his iPhone
- Howler is gone

## Architecture decisions

- **The state is a pure function.** `next(state, event)` in `state.ts` covers every row of the spec's table and is tested without a browser. `engine.ts` only turns element events and calls into events, and state into element calls.
- **The engine takes its environment as an argument.** The element factory, `mediaSession`, the clock and timers come in through `env`, so the tests drive a fake element (an `EventTarget` with `src`, `preload`, `currentTime`, `paused` and a promise-returning `play()`). The browser defaults are filled in only when `env` is left out.
- **Measure early.** `/bench` and the first measurement on the preview come in AE-5, before Media Session and the clean-up. If the 300 ms target misses, the fix changes the engine, so Checkpoint 12 decides it before more is built on top.
- **The bench mutes by default.** Measuring needs the `playing` event, not sound, and nothing plays aloud on Reno's Mac. `/bench` passes an element factory that sets `muted`, with an unmute checkbox for his iPhone. The engine itself has no volume or mute.
- **The client never imports the catalogue.** `/bench` (and later `site`) imports `src/catalogue` and `tracksFrom()` in a server component, and passes plain `EngineTrack`s to the client.

## Dependency graph

```
AE-1 state ──┐
AE-2 tracks ─┴─ AE-3 engine over one element ─ AE-4 hook and index ─ AE-5 /bench, first numbers 🔒
                                                                           │
                                                                   Checkpoint 12
                                                                           │
                              AE-6 Media Session ─ AE-7 remove Howler ─ AE-8 final numbers 🔒 👤
```

AE-1 and AE-2 don't depend on each other. AE-7 doesn't depend on anything, and sits late only so it lands with the module's clean-up.

## Task list

### Phase 12: Playing
- AE-1: The state
- AE-2: Engine tracks from the catalogue
- AE-3: The engine over one element
- AE-4: The hook and the public index
- AE-5: `/bench`, and the first numbers on the preview 🔒

**Checkpoint 12:** the three tap-to-`playing` cases measured on the preview. If one misses 300 ms, Reno and I decide the fix before Phase 13.

### Phase 13: The lock screen, and done
- AE-6: Media Session
- AE-7: Remove Howler
- AE-8: Final numbers, and Reno's iPhone 🔒 👤

**Checkpoint 13:** every success criterion in SPEC-audio-engine.md is ticked, with its evidence.

## Approvals I'll ask for

| When | What |
|---|---|
| AE-5 | A push, so `/bench` is on the preview to measure |
| AE-8 | A push for the final build, then Reno's checks on his iPhone |

Removing Howler is in SPEC.md's confirmed assumptions, so it needs no ask. Nothing is added or installed.

## Risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| The 30 s case misses 300 ms because the browser closed an idle connection | Medium: a fan who scrolls before tapping waits longer | Measured in AE-5, before anything else is built on the engine. Checkpoint 12 decides the fix |
| Safari's small probing range request adds a round trip on iPhones | Medium: iOS is most fans | The warm-up and `intent()` make that request before the tap. Reno's iPhone check in AE-8 |
| A fake element passes tests the real one fails, for example in event order | Medium | `/bench` exercises the real element in AE-5, on desktop and on Reno's iPhone, before Media Session is added |
| Media Session differs between iOS Safari and Chrome | Low: only the lock screen | Feature-checked per handler. AE-8 checks the iPhone, and Chrome's media hub on desktop |
| The Chrome DevTools MCP runs in Brave, whose throttling might not match Chrome's | Low | Same Chromium DevTools presets. The numbers record which browser took them |

## Size and cost

Eight tasks: four small pure-code or wrapper tasks, the engine (medium), the bench, and two measuring tasks that mostly wait on a push and Reno's phone. That's about one session plus the iPhone check. Each task runs the test-first loop and ends in its own commit on `redesign`.

# Implementation Plan: site

Planned on 17 Nov 2026 from [SPEC-site.md](../SPEC-site.md), at Reno's request to finish everything left so he can test the whole site in dev. A separate session builds it. The tasks are SITE-1 to SITE-6 in [todo.md](todo.md), Phase 14. The spec's **(new)** decisions are made without review and listed in it for Reno to accept or change after testing.

- **Order:** the data mapping and image loader first (pure, tested), then the one design-system change (`onIntent`), then the page, then metadata and clean-up, and the full check last.
- **Layout reference:** `/system`'s `StickyStack` already puts the page together with fixtures, so the homepage follows it on a phone, and `HomeDesktop.dc.html` from 768 px.
- **No push.** Reno tests in dev. AE-8 and the preview checks wait for a push he asks for.
- **Size and cost:** six tasks, mostly assembly of parts that are already built and checked. The browser checks are the long part.

# Implementation Plan: release-kit

Planned and built on 18 Nov 2026 from [SPEC-release-kit.md](../SPEC-release-kit.md), as RK-1 in [todo.md](todo.md), Phase 15. No canvas board draws the artwork, so its composition is listed in the spec for Reno's review.

# Implementation Plan: claude-design-system

Planned on 18 Nov 2026 from [SPEC-claude-design-system.md](../SPEC-claude-design-system.md). CDS-1 builds the files locally, and CDS-2, publishing, waits for Reno's OK.
