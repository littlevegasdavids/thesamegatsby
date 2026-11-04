# Spec: design-system (Déjà Gatsby)

Module of the [Déjà Gatsby rebuild](SPEC.md). Depends on nothing. `site`, `release-kit` and `claude-design-system` build on it.

## Objective

One master set of tokens, fonts, textures, assets and presentational components. The site, the release kit and the Claude Design System all read from it, so a release looks like the same world on the page, the cover and the story.

**Direction: nostalgia seen through a cyberpunk lens.** A night city in blue-black, lit by sodium lamps and CRT glow, shot on grainy film. Taken from the moodboard (13 images, 3 Nov 2026):

| Motif | Where it shows up | How the system uses it |
|---|---|---|
| Four-point sparkle star | 5 of 13 images | The signature mark: what's playing, focus, separators, artwork |
| Film grain and halftone | Silhouette, Doberman collage, Y2K figure | Always-on grain layer. Halftone on covers and panels |
| Limited 2–3 colour palettes | Ultramarine alley, yellow ink splash, bone and hazard poster | At most two accents on any surface |
| CRT scanlines and RGB fringing | Angel on a CRT, "Blue" screenshot | Scanlines on the now-playing bar only, never over cover art. A stacked-tape shadow (blue, then red) on all Aero display type |
| Night city and sodium light | Cel-painted towers, foggy apartment block | Blue-black ground, amber as the "on" light |
| Sticker cutouts and Y2K chrome | Red-outlined portrait, chrome boots | Sticker outlines on cutouts. Chrome on the wordmark only |

### Design principles

1. **Night first.** The ground is blue-black. Colour arrives as light (glow, lamp, screen), not as large flat fills.
2. **Two accents per surface at most**, the way the moodboard's images work in limited palettes.
3. **Texture is always on and never loud.** Grain stays at or under 8% opacity. Scanlines appear only on the now-playing bar. **Cover art is never filtered or overlaid**: no scanlines and no on-screen text on top of it.
4. **The sparkle star means "this one".** It marks the active thing. At most three on screen at once.
5. **Readouts talk like a VCR.** VT323, uppercase, glyphs `▶ ■ ◌`, zero-padded time.
6. **Motion moves like tape.** Steps, snaps and flickers, not bouncy springs. Every animation turns off under `prefers-reduced-motion`.

## Tokens

All of these live in `src/design-system/tokens.css` on `:root`, and nowhere else.

### Colour primitives

| Token | Value | Source |
|---|---|---|
| `--dg-ink-950` | `#07080D` | Tape black. Page ground |
| `--dg-ink-900` | `#0E1120` | Night sky. Raised surface |
| `--dg-ink-800` | `#171B30` | Row hover, now-playing bar |
| `--dg-ink-700` | `#2A3050` | Hairlines (decorative only) |
| `--dg-bone-100` | `#F2EBDA` | Bone cream (the skeleton poster). Primary text |
| `--dg-bone-300` | `#BDB6A6` | Secondary text |
| `--dg-bone-500` | `#8A8578` | Tertiary text, component outlines |
| `--dg-sodium-400` | `#FFB23F` | Sodium-lamp amber. The "on" colour: playing, progress, primary button |
| `--dg-signal-300` | `#F4E409` | Signal yellow (the ink-splash image). Focus ring, sparkle star |
| `--dg-hazard-500` | `#FF4B1F` | Hazard orange. REC dot, stop, RGB-split red |
| `--dg-ultra-500` | `#2B3BFF` | CRT ultramarine. Duotone panels, RGB-split blue |
| `--dg-ultra-300` | `#8C96FF` | Links on ink |
| `--dg-white` | `#FFFFFF` | The wordmark on artwork only |
| `--dg-black` | `#000000` | Shadows and the vignette only |

### Semantic tokens

| Token | Maps to |
|---|---|
| `--dg-bg` | `ink-950` |
| `--dg-surface` | `ink-900` |
| `--dg-surface-raised` | `ink-800` |
| `--dg-surface-glass` | `ink-900` at 82% opacity. Used by the sticky header and filter boxes, together with `--dg-glass-filter` |
| `--dg-glass-filter` | `blur(12px) saturate(1.2)`, the backdrop filter behind the glass |
| `--dg-surface-translucent` | `ink-900` at 55%. Nested track rows, which scroll under the expanded release row |
| `--dg-field` | `ink-950` at 60%. The filter's dropdown trigger |
| `--dg-accent-wash` | `sodium-400` at 12%. The selected option in the open filter list |
| `--dg-line` | `ink-700` |
| `--dg-outline` | `bone-500` (borders on interactive components, which need 3:1) |
| `--dg-fg` / `--dg-fg-muted` / `--dg-fg-subtle` | `bone-100` / `bone-300` / `bone-500` |
| `--dg-accent` / `--dg-on-accent` | `sodium-400` / `ink-950` |
| `--dg-focus` | `signal-300` |
| `--dg-star` | `signal-300` |
| `--dg-rec` | `hazard-500` |
| `--dg-link` | `ultra-300` |
| `--dg-panel` / `--dg-on-panel` | `ultra-500` / `bone-100` |

### Contrast

I checked these on 3 Nov 2026. The test suite re-checks them from `tokens.css`.

| Pair | Ratio | Needs |
|---|---|---|
| fg on bg / surface / surface-raised | 16.8 / 15.8 / 14.3 | 4.5 |
| fg / fg-muted on surface-glass (composited over bg) | 16.0 / 9.4 | 4.5 |
| fg-muted on bg / surface-raised | 9.9 / 8.4 | 4.5 |
| fg-subtle on bg / surface-raised | 5.4 / 4.6 | 4.5 |
| fg-subtle on surface-translucent (composited over bg) | 5.3 | 4.5 |
| accent on bg / surface-raised | 11.1 / 9.5 | 4.5 |
| accent on accent-wash (composited over surface-raised) | 7.5 | 4.5 |
| on-accent on accent | 11.1 | 4.5 |
| rec on bg | 6.0 | 4.5 (the REMIX and EDIT tags are small text) |
| link on bg | 7.5 | 4.5 |
| on-panel on panel | 5.6 | 4.5 |
| line on bg | 1.6 | decorative only. Never the only boundary of a control |

### Typography

| Token | Font | Size | Used for |
|---|---|---|---|
| `--dg-text-display-xl` | Aero | `clamp(1.875rem, 5.4vw, 4.5rem)` (30 → 72 px) | Hero titles, `Wordmark` xl |
| `--dg-text-display-l` | Aero | `1.75rem`, then `2.25rem` from 768 px (28 → 36 px) | The wordmark in the header and footer |
| `--dg-text-title` | Chakra Petch 600, uppercase, `0.04em` tracking | `0.9375rem`, then `1rem` from 768 px | Release titles in rows |
| `--dg-text-title-s` | Chakra Petch 600, uppercase, `0.04em` tracking | `0.875rem`, then `0.9375rem` from 768 px | Track titles in nested and hero rows, the now-playing title |
| `--dg-text-body` | Chakra Petch 400, line-height 1.5 | `1rem` | Running text |
| `--dg-text-small` | Chakra Petch: 600, uppercase, `0.12em` for button text; 400 for chips and links | `0.875rem` | Button text, stream chips, footer links |
| `--dg-text-label` | Chakra Petch 600, uppercase, `0.12em` tracking | `0.75rem` | Section labels, meta, tags, the "More" toggle |
| `--dg-text-micro` | Chakra Petch 400 | `0.625rem` | Platform names under the icons in the phone's now-playing bar, and nowhere else. At 12 px, "SoundCloud" doesn't fit a 62 px button |
| `--dg-text-readout` | VT323 | `1.25rem`, then `1.375rem` from 768 px | Time, the bar readout, the discography label |
| `--dg-text-readout-s` | VT323 | `1.125rem`, the readout floor | Row meta lines, counts, the lead-track note |

- Font families: `--dg-font-display: "Aero"`, `--dg-font-ui: "Chakra Petch"`, `--dg-font-readout: "VT323"`, each with a system fallback stack.
- **These sizes were retuned on 3 Nov 2026 to match the approved screens.** The style tile's 112 px wordmark is a specimen, not a product size. The now-playing title stays in Chakra Petch at every width, as drawn.
- **Aero is used only at 28 px and above** (the smallest display-l size), which satisfies the 24 px rule with margin. It has one weight and a built-in slant, so never set it in faux bold or italic.

### Space, radius, motion

- **Space:** `--dg-space-1` … `--dg-space-9` = 4, 8, 12, 16, 24, 32, 48, 64, 96 px.
- **Radius:** `--dg-radius-0: 0`, `--dg-radius-s: 4px`, `--dg-radius-m: 8px` (the filter trigger and options, the playing row), `--dg-radius-l: 12px`. Aero's own corners are rounded rectangles, so match them and avoid full pills. `--dg-chamfer` is a `clip-path` that cuts the top-right corner by 12 px, for primary buttons.
- **Motion:** `--dg-ease-tape: cubic-bezier(0.2, 0.8, 0.2, 1)`. Durations `--dg-dur-1/2/3` = 120 / 240 / 480 ms. Flicker uses `steps()` timing.
- **Layers:** `--dg-z-texture`, `--dg-z-bar`, `--dg-z-overlay`.
- **Breakpoint:** one, at 768 px. Tokens that change there are redefined in a media query inside `tokens.css`. Media queries can't read custom properties, so the 768 px literal appears in each one.
- **Sticky stack:** each layer's `top` is a `calc()` of the layers above it:
  - `--dg-header-inset` is 10 px, or 12 px from 768 px
  - `--dg-header-h` is 60 px, or 68 px
  - `--dg-sticky-gap` is 6 px, or 8 px
  - `--dg-filter-h` is 60 px, or 70 px
  - `--dg-sticky-filter` = inset + header + gap
  - `--dg-sticky-release` = `--dg-sticky-filter` + filter + gap
  - `--dg-release-h` is 72 px, or 80 px: a `ReleaseRow`'s height
  - `--dg-sticky-clear` = `--dg-sticky-release` + release + gap, the stack's reach with a release stuck. A scroll container pads its top by it (DS-22)
  - `--dg-bar-h` is 0 px, until `NowPlayingBar` sets it on its scroll container to its own measured height. The scroll container pads its bottom by it (DS-24)

### Shadows, glows and the backdrop

Read off the approved screens on 3 Nov 2026.

| Token | Value | Used by |
|---|---|---|
| `--dg-shadow-float` | `0 8px 24px`, black at 45%. `0 10px 30px` from 768 px | The header and filter boxes |
| `--dg-shadow-menu` | `0 16px 40px`, black at 60% | The open filter list |
| `--dg-shadow-bar` | `0 -16px 32px`, black at 55%. `0 -16px 40px` from 768 px | The now-playing bar |
| `--dg-glow-accent` | `0 0 8px`, sodium at 60% (a text-shadow) | Active readouts |
| `--dg-glow-accent-box` | `0 0 8px`, sodium at 80% | The progress fill |
| `--dg-glow-cover` | `0 0 40px`, ultramarine at 25%. `0 0 60px` at 28% from 768 px | Hero covers. It sits outside the art, never over it |
| `--dg-tape` | `0.03em 0.04em 0` ultramarine, then `0.06em 0.08em 0` hazard at 55% | All Aero display type (V5) |
| `--dg-tape-artwork` | `0.045em 0.06em 0` ink-950, with a `--dg-white` fill | The wordmark on artwork |
| `--dg-grid-line` | Ultramarine at 20%, or 17% from 768 px, on a 1 px line. That matches the canvas, whose pattern tiles clip half of a 1 px stroke at 50% (45%). Reno chose it at Checkpoint 4 (3 Nov 2026) | Backdrop grid lines |
| `--dg-grid-cell` | 32 px, or 40 px from 768 px | Backdrop grid |
| `--dg-grid-drift` | 5 s, or 6 s from 768 px, for one cell | Backdrop grid |
| `--dg-grid-glow` | Ultramarine at 30% (28% from 768 px), a radial in the upper part of the screen: 70% of the screen across and down, centred at 50% 20% (60%, at 30% 25%, from 768 px) | Backdrop, behind the hero |
| `--dg-scanline` | ink-950 at 22%, a 1 px line every 3 px | The now-playing bar |
| `--dg-vignette` | Black at 30% at the edges, clear inside the middle 65%, an ellipse centred at 50% 35%, as on the phone board. `none` from 768 px, as on the desktop board. Reno chose both at Checkpoint 4 (3 Nov 2026) | The page frame, on phones |

## Fonts

| File | Source | Licence | Subset |
|---|---|---|---|
| `aero.woff2` | Reno's upload (`Aero.ttf`, Nirmal Biswas, v1.000), from dafont.com/aero-2.font | **Donationware: USD 25+ to the author. Reno will pay.** Web use still to be confirmed by the author (SPEC.md open question 1) | Basic Latin + Latin-1 |
| `chakra-petch-400.woff2`, `chakra-petch-600.woff2` | Google Fonts | SIL OFL 1.1 | Basic Latin + Latin-1 |
| `vt323-400.woff2` | Google Fonts | SIL OFL 1.1 | Basic Latin + Latin-1. It has no `▶■◌` (open question 1) |

- The fonts total **90 KB or less**, measured after subsetting. Only Aero and Chakra Petch 400 are preloaded. Everything uses `font-display: swap`.
- Each licence file sits beside its font in `fonts/`.
- Converting and subsetting needs fonttools (`pyftsubset`). Installing it is an ask-first step.
- VT323 doesn't include `▶■◌`, so the glyphs come from the sparkle and icon SVGs instead of a fallback font, and the readout never switches typeface mid-line.
- Latin-1 gaps in the fonts themselves: Aero has no `¹²³¼½¾` or soft hyphen, and Chakra Petch has no `µ`. Those characters fall back to the system font.

## Textures (`textures.css`)

| Utility | Built from | Notes |
|---|---|---|
| `.dg-grain` | A 256 × 256 tiled SVG `feTurbulence` noise tile, inline in `textures.css` (under 1 KB, no image file), at opacity `--dg-grain-opacity: 0.07` with normal blending | Static, as on the canvas. Reno chose normal blending on 3 Nov 2026 (DS-7). Measured on tape black, `overlay` left the grain invisible, while normal blending at 0.07 shows about 77% of the canvas's grain (screen, 0.09). It also needs no blend mode over scrolling content, and it can share one layer with the vignette |
| `.dg-scanlines` | `repeating-linear-gradient` of `--dg-scanline`, zero bytes | The now-playing bar only. Never over cover art, so the bar's thumbnail sits above them |
| `.dg-halftone` | `radial-gradient` dot mask | Covers and duotone panels |
| `.dg-tape` | `--dg-tape` as a `text-shadow` (V5 "stacked tape") | The wordmark and every Aero title |
| `.dg-glass` | `--dg-surface-glass` with `backdrop-filter: var(--dg-glass-filter)`. Solid `--dg-surface` where `backdrop-filter` isn't supported | The header and filter boxes |
| `.dg-glow` | `--dg-glow-accent` as a text-shadow | Active readouts and the play state. Lit boxes (the progress fill, a lamp dot) take `--dg-glow-accent-box` as their box-shadow, because a box-shadow on a readout would light its whole box |
| `.dg-sticker` | Stacked `drop-shadow` outline | Cutout images |
| `.dg-vignette` | `radial-gradient` overlay | The page frame, below 768 px |
| `.dg-backdrop` | One fixed layer behind all content: the `--dg-grid-*` grid at roughly even strength top to bottom, drifting downward one cell per `--dg-grid-drift` in a seamless loop, with the `--dg-grid-glow` behind the hero | Transform only, so it never triggers layout or paint. The grid is a conic-gradient tile on a layer one cell taller than the screen, moved down one cell per loop. Static under reduced motion. DS-8 scrolled two glass boxes over it at 4× CPU with no long frames |

The page-level layers (grain and vignette) are one fixed element with `pointer-events: none`. They must not add layout shift or make scrolling janky on a mid-range phone.

## Assets (`assets/`)

- `sparkle-star.svg`: an original four-point star path on a 24 × 24 viewBox, drawn for this system. It's the signature mark. The file bakes in `--dg-star`'s signal yellow, so it shows up as an image outside the page, and a test keeps the two in step. `SparkleStar` draws the same path inline.
- `wordmark.svg`: "Déjà Gatsby" set in Aero and outlined, so the logo doesn't depend on the font loading. The `Wordmark` component draws both tones below from tokens, and the file is exported in the screen tone. Bone-white with the V5 "stacked tape" shadows: `0.03em 0.04em 0 #2B3BFF, 0.06em 0.08em 0 rgba(255,75,31,0.55)`. No chrome and no gloss. On artwork it's white with a `0.045em 0.06em` black drop. The file is one path drawn by three `<use>`s, under 6 KB. Its viewBox holds the whole mark, shadows included, and its size is the mark at a 100 px em (619 × 91). A test keeps its path, offsets and colours equal to the component's and the tokens'.
- Platform icons as inline SVG: the five main platforms (Spotify, Apple Music, YouTube Music, SoundCloud, Bandcamp) and the three under "More" (Amazon Music, Deezer, Tidal). The two social icons (Instagram, TikTok) are inline SVG too. Source: Simple Icons 16.36.0 (CC0), which Reno approved downloading on 4 Nov 2026. Each brand's own trademark guidelines still apply, so keep brand icons monochrome in `--dg-fg`.
  - **Amazon Music isn't in Simple Icons** (16.36.0 has no file for it). Until its own mark is sourced, it uses the canvas's hand-drawn stand-in, Reno's pick on 4 Nov 2026. It must be replaced before public launch, and fetching Amazon's mark is a separate ask.

## Components

Every component is presentational. It renders from props and raises callbacks, and it never imports `audio-engine`. `site` does the wiring.

| Component | Props (summary) | States to show on `/system` |
|---|---|---|
| `SparkleStar` | `size` (px), `twinkle?`, `label?`. Filled with `currentColor`, which is `--dg-star`. A parent retints it by setting `--dg-star`, as the hero label does with the accent. Decorative (`aria-hidden`) unless labelled, then `role="img"` with that name | static, twinkling, reduced motion, amber in the hero label |
| `Wordmark` | `size: xl \| l`, `tone: screen \| artwork` (default `screen`). Its box is the type's own at line-height 1, 6.099em × 1em, so it lays out like the canvas's line of Aero. As on type, the D's slant and the tape draw past that box. `role="img"`, named "Déjà Gatsby" | xl, l, artwork |
| `VhsReadout` | `mode: load \| play \| stop \| ended`, `elapsed`, `duration` (seconds, shown through `formatTime`). It reads "PLAY 00:12 / 00:30" in VT323 at `--dg-text-readout`, with the mode's glyph as an 11 px `aria-hidden` SVG beside the text, as the bar boards draw it. It's plain text, never a live region | load, play, stop, ended (reads "END") |
| `Button` | `variant: primary \| ghost \| hardware`, `label`, `icon?: play \| stop \| replay \| close`, `pressed?` (a toggle, as `aria-pressed`), `disabled?`, `onClick?`. Every button takes a `label`: it's the visible text on primary and ghost, and the accessible name on hardware, which shows only its icon. Hardware requires `icon`. The types reject a button without a name | default, hover, focus-visible, active, disabled |
| `ReleaseHero` | `release` (single, EP or album: its `leadTrackId` and `links` are the hero's lead track and stream links), `playingTrackId`, `playState`, `elapsed`, `onPlay(trackId)`, `defaultShowAll?` | single, EP (all tracks listed), album (first five plus "Show all", and open), playing, played, a long title, 360 and 1280 px |
| `ReleaseFilter` | `options[]` (label, count), `selected`, `onSelect` | Below 768 px, a "Show" dropdown: closed ("All releases"), open (the selected option ticked in amber). From 768 px up, a row of buttons with the selected one filled amber. Both show one type selected, a type with no releases left out, and the filter stuck under the header mid-scroll |
| `ReleaseRow` | `release` (single, EP or album, with cover, title and tracks), `expanded`, `playingTrackId`, `playState`, `elapsed`, `onToggle`, `onPlay` | single idle, playing ("PLAYING 00:09") and played ("PLAYED"), EP collapsed and expanded with a nested track playing, remix and edit tags, long title at 360 px, an expanded album stuck under the filter mid-scroll, and the hand-off as its last track leaves |
| `TrackRow` | `index` (the track's place on its release, from 1), `title`, `duration`, `elapsed`, `state: idle \| loading \| playing \| played`, `lead?`, `variant: nested \| list`, `onToggle` | `nested` (inside an expanded `ReleaseRow`) and `list` (the hero tracklist, with and without LEAD), each in all four states, plus a long title at 360 px |
| `ProgressTape` | `ratio` (0–1). A 3 px `--dg-line` track with an `--dg-accent` fill and `--dg-glow-accent-box`, as the bar boards draw it. The fill keeps the track's width and is scaled from the left edge by `transform: scaleX()` on `--progress`, which is set inline, so it never causes layout. A ratio past either end is held to it, and NaN (before the audio knows its length) reads 0. `aria-hidden` | 0, mid (0.4, the boards' 12 of 30), 1, running, reduced motion |
| `StreamLinks` | `links[]` (platform + URL), `variant: bar \| chips`, `heading`, `emphasis?` | the five main platforms only, all eight ("More" closed and open), a release missing one of the five, `bar` emphasised, `chips` |
| `NowPlayingBar` | `track` (title, cover), `state: loading \| playing \| ended`, `elapsed`, `duration`, `onStop`, `onReplay`, `onClose`, `streamLinks`, `defaultMoreOpen?` | loading, playing, ended (Replay and Close, stream emphasised), "More" open, a long title, 360 px |
| `SocialLinks` | `links[]` (Instagram, TikTok, each with a handle), `variant: icons \| handles \| footer` | icons in the phone header row (44 px targets), icon + @handle in the desktop header row, phone footer block, focus |
| `Screen` | `children` | The page frame: grain, vignette, safe-area padding |
| `SiteHeader` | `socials`, `variant: floating \| bar` | Floating (default): a box inset 10 px on a phone and 12 px from the top on desktop, with a 12 px radius, `--dg-surface-glass`, a `--dg-line` border and a soft shadow. Bar: full width with a bottom hairline. Both shown at the top and mid-scroll at 360 and 1280 px |

**Behaviour the components must get right:**
- `SparkleStar`'s twinkle is a tape flicker, since the canvas draws every star still. Every 2.4 s (20 × `--dg-dur-1`) it snaps to 70% size at 40% opacity, then 85% at 70%, then back, holding each for one `--dg-dur-1` on `steps()` timing. It animates `opacity` and `transform` only, and holds still under reduced motion. DS-9 proposed it, and Reno approved it at Checkpoint 5.
- `VhsReadout`'s modes. Play glows amber (`--dg-accent` with `--dg-glow-accent`) beside ▶, and ended drops to `--dg-fg-muted` beside ■, as drawn. The word is written in capitals rather than set with `text-transform`, so every browser exposes the text it shows.
  - **Load and stop were DS-12's proposal, approved at Checkpoint 5.** The canvas draws neither. Both are muted like ended, with no glow, so the lamp is lit only while the tape runs. Stop takes ■, and load takes ◌, drawn as eight dots on a ring. Neither moves.
- `ProgressTape` glides between updates. **This was DS-13's proposal, approved at Checkpoint 5.** The board's tape steps once a second with no motion. The built fill moves across each gap with a linear `--dg-dur-2` transition on `transform`, close to the 250 ms between `timeupdate` events, so it moves at a steady rate instead of jumping 3 px (phone) to 12 px (desktop) four times a second. A jump back (replay, or a new track) rewinds in the same 240 ms. Under reduced motion it jumps to each new value. Because the glow is scaled with the fill, it reaches 8 × ratio px past the leading edge, where the board's reaches 8 px. Above and below the tape, and at 0 and 1, it matches the board.
- `TrackRow`'s whole hit area is one `<button>` with `aria-pressed`, labelled "Play {title} snippet" or "Stop {title} snippet". Stream links are not inside the row button. Idle, the time column shows the snippet's length ("0:30"). While playing, the number becomes the sparkle, the time column counts `elapsed` ("00:12") in amber, and the ring fills amber with a stop square. Once played, it reads "END". The number, time and ring columns have fixed widths, so changing state never moves the title.
  - **A played row stays lit, as `Main.dc.html` draws it** (Reno chose this on 4 Nov 2026). It keeps the raised fill, the amber title and the sparkle, and on a single `ReleaseRow` the amber cover outline. Only the words change ("PLAYED", or "END" in the time column), and the ring goes back to an outlined play. The row is no longer pressed, so its label reads "Play …" again.
  - **Loading was DS-19's proposal, approved at Checkpoint 7** (4 Nov 2026). The canvas doesn't draw it. A loading row looks like a playing one (raised fill, amber title, sparkle, an amber ring with the stop square, pressed and labelled "Stop …", since a tap cancels it), but the time column shows the readout's load glyph, the dotted circle, muted and still, in place of the time. As on `VhsReadout`, the lamp lights only once the tape runs. A loading single `ReleaseRow` is lit and pressed the same way, and its meta reads "LOADING", muted, beside the sparkle (DS-20).
- **Hover on rows, as the desktop boards draw it** (Reno chose this on 4 Nov 2026). A `ReleaseRow` and a `list` `TrackRow` fill with `--dg-surface`. A `nested` `TrackRow`, already on the translucent surface, fills with `--dg-surface-raised`. A filter button's border turns `--dg-accent`. As on `Button`, hover applies only where there's a real pointer (`hover: hover`), each change is a snap with no transition, and a lit row keeps its raised fill.
- `Button` variants:
  - `primary`: amber with `--dg-chamfer`, 48 px tall. The cut corner must not clip the focus ring, so the chamfer clips a layer behind the label, not the button
  - `ghost`: an `--dg-outline` border, 48 px tall, as on the style tile
  - `hardware`: the square icon button (stop, replay, close), 44 px, with the same border as ghost
  - The type is `--dg-text-small` (Chakra Petch 600, uppercase, `0.12em`). The glyphs are the canvas's, filled or stroked in the label's colour.
  - **States.** The canvas draws none of these, so they were DS-11's proposal, which Reno approved at Checkpoint 5. Each change is a snap, with no transition:
    - **Hover and press light the button.** Primary takes `--dg-glow-accent-box` as a drop-shadow, which follows the cut corner. Ghost and hardware fill with `--dg-surface-raised`, and their border turns `--dg-fg`. On the now-playing bar the fill matches the bar, so the border is what shows. Hover applies only where there's a real pointer (`hover: hover`), so a tap doesn't leave a button lit.
    - **Press also pushes it down 1 px.**
    - **Focus-visible:** a 2 px `--dg-focus` outline, 2 px out, on keyboard focus only.
    - **Disabled** uses the `disabled` attribute, so it's announced and skipped by Tab. Primary turns `--dg-fg-subtle` on `--dg-surface-raised` (the lamp off), while ghost and hardware keep their border and turn their label `--dg-fg-subtle`. Hover and press leave it alone.
- `ReleaseHero`, as the hero boards draw it:
  - A label with the sparkle in amber: "New single", "New EP · 2 tracks" or "New album · 8 tracks". The section is named by it.
  - The cover across the column on a phone (350 px at 390), and 480 px (single) or 440 px (EP, album) on desktop, square, with `--dg-radius-l`, a hairline and `--dg-glow-cover`. Its frame holds the image alone.
  - The Aero title (`<h1>`, `--dg-text-display-xl`, `.dg-tape`). A word too long for the line breaks rather than overflow.
  - A single gets "Play snippet" and "Stream it on" chips. An EP or album gets "Play lead track", with the lead's title beside it in `--dg-text-readout-s` capitals, then "On this EP" or "On this album" over `list` `TrackRow`s with LEAD on the lead, then "Stream the EP" or "Stream the album" chips. The lead's note stays on the button's line and truncates, so the button changing label never moves the page.
  - An album shows its first five tracks, and "Show all N tracks" under them: a `<button>` with `aria-expanded` and `aria-controls`, 44 px, in the `--dg-outline` border (the board draws `--dg-line`, which can't be a control's only boundary). The tracks past five stay in the page, `hidden` while it's closed. It hovers amber, like the chips. **Open, it reads "Show fewer tracks" with its chevron flipped: DS-23's proposal, for Checkpoint 8,** since the canvas draws only the closed toggle.
  - From 768 px it's two columns, the cover on the left. A single's column is centred beside the cover, and an EP's or album's starts at its top.
  - **Playing follows G7. The canvas doesn't draw it, so Reno sees it at Checkpoint 8.** The playing track's row takes the playing look. While the lead track loads or plays, the main button reads "Stop snippet" with the stop glyph, pressed (`aria-pressed`, through `Button`'s `pressed`). Once played, or while another track plays, it reads "Play snippet" or "Play lead track" again.
- `SiteHeader` is sticky to the top: the wordmark on the left, `SocialLinks` on the right. The page reserves its height, so nothing loads hidden beneath it. The grid and content scroll behind its glass. Where `backdrop-filter` isn't supported, it falls back to a solid `--dg-surface`.
- **Three sticky layers while scrolling the discography, in order from the top:**
  - `SiteHeader`.
  - `ReleaseFilter` (on desktop, the whole "Discography" row including the buttons): a contained box like the header (inset 10 px on a phone, `--dg-surface-glass`, hairline border, 12 px radius, soft shadow), sticking 6–8 px below the header.
    - **On a phone (below 768 px) it's a dropdown.** Closed, it reads "Show · All releases 8 ▾". Open, it drops a list of 48 px options with counts, with the selected one ticked in amber. Picking one filters the list and closes the menu. It's a button with `aria-haspopup="listbox"` and `aria-expanded`, opening a `listbox` of `option`s. Arrow keys move through the options, Enter picks one, and Escape closes the list.
      - **The open list keeps focus and points at the active option** (`aria-activedescendant`). Up and Down on the trigger open it, Home and End jump to the ends, Space picks like Enter, and Tab or a tap outside closes it. Picking or Escape returns focus to the trigger.
      - **The active option shows the 2 px `--dg-focus` ring, inset, while the list has keyboard focus.** It was DS-21's proposal, approved at Checkpoint 7 (4 Nov 2026), since the canvas draws no keyboard state for the list.
    - **From 768 px up it's a row of buttons** with counts, the selected one filled amber (`aria-pressed`), in a `role="group"`. "All" shows its count too: `HomeDesktop.dc.html` draws it without one, and the spec wins. The row stays one line at the token height, and scrolls sideways where it doesn't fit (plan.md's risk mitigation).
    - **Counting:** each release counts under exactly one type. A single whose track is a remix or edit counts under Remixes & edits, not Singles. An EP or album counts under its own type, even if it holds a remix. "All" counts everything.
  - An **expanded** EP or album `ReleaseRow`: opaque `--dg-surface`, sticking directly under the filter box. It's sticky inside its own release group, so it stays put while that release's tracks scroll beneath it, then leaves with its last track and the next expanded release takes its place. Collapsed releases and singles never stick.
  - Each layer's `top` is the sum of the layers above it. Nested tracks scroll under the release row on a translucent surface.
  - **The page's scroll container sets `scroll-padding-top: var(--dg-sticky-clear)`** (on `/system`, each `SystemFrame`, and in `site`, the root). Without it, Shift+Tab up the list scrolls a focused row in beneath the header, filter or stuck release, which fails WCAG 2.4.11 and this spec's visible-focus rule. DS-22 found this.
- `NowPlayingBar` is fixed to the bottom, respects `env(safe-area-inset-bottom)`, and reserves its height so nothing on the page is ever hidden behind it. In the `ended` state it stays up:
  - the readout reads "END"
  - Replay and Close replace Stop
  - the heading becomes "Hear the full track", with the sparkle
  - the five stream buttons fill amber

  How it's built (DS-24):
  - **It goes at the end of the page.** It leaves an in-flow spacer there, and measures itself with a `ResizeObserver`, setting `--dg-bar-h` on its nearest scroll container (the page's root, or a `SystemFrame`). The spacer is that tall, and **the scroll container sets `scroll-padding-bottom: var(--dg-bar-h)`**, so the last content scrolls clear of the bar, and Tab never leaves focus behind it, even with "More" open or the links wrapped. `site` sets it on its root, beside `scroll-padding-top`.
  - Stop and Replay are the same button, relabelled, so focus stays on it when the snippet ends. Close joins it once ended, as an outlined hardware button (the board's is borderless).
  - A polite live region announces "Playing {title}" and "Snippet ended", never the time. `VhsReadout` stays plain text.
  - The scanlines lie over the bar beneath its content, so they never cover the thumbnail.
  - The bottom padding is `--dg-space-4` (`--dg-space-3` from 768 px) plus the inset.
  - **Loading is DS-24's proposal, for Checkpoint 8.** The canvas doesn't draw it. The readout reads "LOAD 00:00 / 00:30", muted, with the dotted circle, the tape is at 0, and Stop shows, since a tap cancels it.
  - **From 768 px the track and the links share one row where they fit, and the links wrap under the track where they don't. That's DS-24's proposal, for Checkpoint 8.** At 14 px type with 44 px targets, the heading and five links need 818 px, so with the 320 px track the row needs about 1170 px. The bar's 1200 px container gives 1136, so it's two rows at every desktop width, where `HomeDesktop.dc.html` draws one at 1440 px in 13 px type.
- `StreamLinks` shows Spotify, Apple Music, YouTube Music, SoundCloud and Bandcamp as five equal buttons, in that fixed order. The `heading` sits on the same row as the "More" toggle. There are two variants:
  - `bar` (the now-playing bar): each button has an icon plus a visible label
  - `chips` (the hero): wrapping text chips, 44 px tall, with "More" as the last chip

  Amazon Music, Deezer and Tidal sit behind a "More" disclosure (a `<button>` with `aria-expanded`, no popover library), in that order. "More" only renders when the song has at least one of them. A platform the song isn't on is left out, not shown disabled. Links open in a new tab with `rel="noopener"`.
  - **The toggle reads "More" while closed and "Less" while open,** with its chevron flipped, as `Main.dc.html` draws it. `aria-expanded` carries the state. Reno chose this on 4 Nov 2026.
  - **In `chips`, the extras follow the toggle** in the same wrapping row when it's open. The canvas doesn't draw this. It was DS-16's proposal, approved at Checkpoint 6.
- **Hover on links, as the desktop boards draw it** (Reno chose it on 4 Nov 2026). A stream chip, a bar button, the "More" toggle and a footer social button turn their border and text `--dg-accent`. A header social link turns its text `--dg-accent`. An emphasised bar button, already amber, takes `--dg-glow-accent-box` instead, like the primary button. As on `Button`, hover applies only where there's a real pointer (`hover: hover`), and each change is a snap with no transition. Keyboard focus shows the 2 px `--dg-focus` ring, 2 px out.
- On a 360 px screen, `NowPlayingBar` uses two rows. Row one holds the cover, title, readout and stop button. Row two holds "STREAM FULL TRACK" and the five buttons, each 44 px or larger (about 62 px wide at 360 px).
- The progress shown by `ProgressTape` is visual only (`aria-hidden`). The readout carries the time as text.

## The `/system` route

- Unlinked from the site, with `<meta name="robots" content="noindex">`. Its code is never loaded by `/`.
- It shows every token (swatches with their contrast values, the type scale, space, radius, motion), every texture, every asset, and every component in every state listed above.
- It uses a fixture of the six current songs. Fixture covers are 320 px JPEG copies of today's covers, made with macOS `sips`. Real covers come from `media-pipeline`.
- `claude-design-system` publishes from this route later.

## Scaffold (first piece of work in this module)

There's no working React 19 setup in the repo, and Chakra 2 won't come along, so this module starts by replacing the stack:
- Upgrade to Next.js 16 / React 19 / TypeScript 5 with the App Router and `output: 'export'`. Remove Chakra, Emotion, Framer Motion, react-icons and `yarn.lock`.
- Remove `pages/`, `components/` and `styles/`. Until `site` lands, `/` shows a plain placeholder listing the songs. Production is unaffected, because Vercel serves `main`.
- Add the `lint`, `typecheck` and `test` scripts, and the `tests/` folder.
- Howler stays installed until `audio-engine` replaces it. Nothing imports it in the meantime.

## Acceptance criteria

- [ ] `tokens.css` defines every token in this spec. A test fails if a hex colour, `rgb()` value or font-family name appears in any `.css` or `.tsx` file under `src/` other than `tokens.css` and `textures.css`.
- [ ] A test parses `tokens.css` and confirms every pair in the contrast table meets its requirement.
- [ ] Subset fonts total 90 KB or less. `font-display: swap`. Only two preloads.
- [ ] `/system` renders every token, texture, asset and component state in this spec, with no console errors, at 360, 768 and 1280 px, and no horizontal scroll.
- [ ] Every interactive element is reachable by keyboard and shows a visible `--dg-focus` ring. Touch targets are 44 px or larger.
- [ ] With `prefers-reduced-motion: reduce`, nothing animates (no grain jitter, star twinkle, flicker or tape motion).
- [ ] `npm run build` produces `out/` with no server output. `/` loads no code from `/system`.
- [ ] `npm run typecheck`, `npm run lint` and `npm test` pass.

## Out of scope for this module

Audio playback logic, real catalogue data, the homepage layout, the release kit, publishing to Claude, and anything on Cloudflare.

## Open questions

1. **VT323 coverage of `▶■◌`. Answered 3 Nov 2026 (DS-5): it has none of them.** VT323 v2.000 from `google/fonts` maps none of U+25B6, U+25A0 or U+25CC, so the readout glyphs come from SVGs, as the Fonts section says. (Chakra Petch has `▶■` but not `◌`, and isn't the readout face anyway.)
