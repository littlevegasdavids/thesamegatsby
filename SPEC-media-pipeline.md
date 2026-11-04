# Spec: media-pipeline

Module of the [Déjà Gatsby rebuild](SPEC.md). Depends on `cloudflare-infra` for the R2 bucket, the media domain and Wrangler. `audio-engine`, `site` and `release-kit` read the catalogue it writes.

Approved by Reno on 4 Nov 2026, as drafted, and its seven open questions answered the same day.

## Objective

Adding a song is one command. `npm run add-song` takes a WAV master and a cover, and:
- cuts a 30-second snippet with the fades baked in, encoded so a browser can start playing from the first few kilobytes
- sizes the cover for every place the site and the release kit draw it
- names every file by a hash of its content, so it can be cached forever
- uploads the files to R2 and checks the media domain serves them
- writes a typed, validated entry into the catalogue

All that's left by hand is committing and deploying (SPEC.md, success criteria). The module also re-cuts the five current releases (six tracks) from their masters, and retires the old site's `public/music/`.

**Who it's for:** Reno, on his Mac, adding a release. Fans never see this module directly. What they get from it is a snippet that starts fast and covers that load light.

## What exists today (checked 4 Nov 2026)

| | |
|---|---|
| Catalogue | `songs/index.ts`: six flat `Song` entries with numeric ids, four platform links each, and `/music/...` paths. Only the placeholder `src/app/page.tsx` imports it. There are no releases, track kinds, dates or Bandcamp, Amazon Music, Deezer or Tidal links |
| Snippets | `public/music/<name>/audio.m4a`: AAC stereo at 44.1 kHz, **15.0–17.8 s** long, **253–279 kbps**. In all six the atoms run `ftyp free mdat moov`, so the index sits at the end of the file, as SPEC.md says |
| Covers | `public/music/<name>/cover.*`. Can't You See is a 2048² PNG, You who could be Forever a 2500² PNG and Welcome to Vapor_City a 1080² PNG. **Give me that KaiZen is 1469 × 1457, so not square.** **Bring That Change is a 564 KB SVG wrapping a 1666 × 2500 raster** that it clips to a 1600² frame. UKG 333 has no cover and uses the EP's |
| Size | `public/music/` is 21 MB, all copied into `out/` on every build |
| `/system` fixtures | `public/system-fixtures/`: 320 px JPEGs of five covers (196 KB in all), and `src/app/system/fixtures.ts` with the real links and the canvas's bracketed examples |
| Tools on the Mac | **`afconvert`, `afinfo` and `sips` ship with macOS.** `cwebp` 1.6.0 is installed through Homebrew. ffmpeg, ffprobe and Wrangler aren't installed |

### What the built-in tools turned out to do

Tried on 4 Nov 2026, on the current files:
- **`afconvert` uses Apple's own AAC encoder** (`-d aac`), which SPEC.md leaned towards, **and it writes `moov` before `mdat`** (`ftyp moov free mdat`). So neither ffmpeg nor a `+faststart` remux is needed.
- **Two encodes of the same input differ in only six bytes:** the creation and modification times in the `mvhd`, `tkhd` and `mdhd` boxes. Zeroing those makes the output byte-identical, so a content hash names the same file the same way every time.
- **`sips` writes AVIF on this macOS (27.0.1), and renders the Bring That Change SVG to a 1600² PNG.** Its AVIF output is byte-identical across runs and carries an sRGB profile. It can't write WebP, which is why `cwebp` is used for WebP (open question 2).

Neither `afconvert` nor `sips` can cut a time range or fade, so that part is Node code over PCM (see Snippet).

## How `add-song` works

```
master.wav ─► afconvert → float WAV ─► Node: cut at --start, 30 s, bake fades ─► afconvert → AAC .m4a ─► zero timestamps ─► hash ┐
cover.png  ─► sips: check square, ≥ 1080 px ─► sips → sRGB PNG ─► sips → AVIF ×4, cwebp → WebP ×4 ────────────────────────► hash ┤
                                                                                                                               ▼
                                     .media/<key> (staged) ─► wrangler r2 object put ×9 ─► HEAD each key on media.thesamegatsby.com ─► write songs.json
```

The order is fixed: **build, then upload, then verify, then write**. The catalogue is only written once every file is confirmed live on the media domain, so a failure at any step leaves `songs.json` untouched. A half-finished upload can leave objects in R2 that nothing points at. That's harmless, because keys are immutable and a re-run uploads the same bytes to the same keys.

### Snippet

| Setting | Value | Why |
|---|---|---|
| Input | Anything Core Audio reads (WAV, AIFF, FLAC), 1 or 2 channels | Masters stay outside the repo. `add-song` reads them from the path it's given |
| Length | **30 s**, cut from `--start` | Confirmed assumption 1. A master shorter than start + 30 s is refused, not padded |
| Fades | Baked into the samples: **0.15 s in, 2 s out**, on a raised-cosine curve. `--fade-in` and `--fade-out` override them per song | SPEC.md's decision to bake fades in at encode time. Reno chose the values (open question 1) |
| Gain | None. The master's level is kept, and `add-song` prints the snippet's peak level | Open question 5 |
| Codec | AAC-LC, Apple's encoder through `afconvert -d aac -b 160000 -s 2 -q 127` (constrained VBR, best encoder quality) | SPEC.md's lean: about 160 kbps, Apple's encoder |
| Sample rate | The master's when it's 44.1 or 48 kHz. Anything else is resampled to 48 kHz | Avoids resampling the usual masters |
| Container | `.m4a`, `moov` first, timestamps zeroed | Fast start, and deterministic bytes for the hash |
| Size | About 600 KB for 30 s | 160 kbps × 30 s |

The cut and the fades are plain `.ts`: parsing a float WAV, slicing it, multiplying by the fade curve and writing it back. `afconvert` first turns any master into 32-bit float WAV, so the Node code only ever reads one format.

### Covers

| Setting | Value |
|---|---|
| Source | Anything `sips` reads (PNG, JPEG, TIFF, HEIC, and SVG as Bring That Change shows). **It must be square and at least 1080 px.** A non-square cover is refused, unless `--crop` centre-crops it. A smaller one is refused outright |
| Widths | **192, 384, 768 and 1080 px** |
| Formats | AVIF through `sips`, and WebP through `cwebp` as the fallback (open question 2). `add-song` checks `cwebp` is there before it starts, and stops with `brew install webp` if not |
| Quality | AVIF at 50, overridden per release with `--cover-quality` (open question 3) |
| Colour | `sips` first writes the source out as a full-size sRGB PNG, which both encoders read (`cwebp` can't read SVG or HEIC). The art is shown opaque, so any alpha channel is flattened. Three of the current PNGs have one, and whether any of their pixels are actually transparent gets checked when they're re-cut |
| Metadata | No EXIF or GPS in the output |

**Where each width is used:**
- 192: row and bar thumbnails, which are 48–60 CSS px, so at 3× density
- 384 and 768: in-between densities, and the hero on small or 1× screens
- 1080: the phone hero (350 CSS px at 3× needs 1050), and `release-kit`'s 1080 px wide post and story

**Measured on the current covers** (4 Nov 2026, `sips` AVIF at quality 60):

| Cover | 192 | 384 | 768 | 1080 |
|---|---|---|---|---|
| Welcome to Vapor_City | 4.9 KB | 13.9 KB | 36 KB | 58 KB |
| Bring That Change (SVG, rendered) | 6.9 KB | 18.8 KB | 43 KB | 65 KB |
| Give me that KaiZen | 7.1 KB | 23.6 KB | 57 KB | 103 KB |
| You who could be Forever | 10.6 KB | 28.1 KB | 73 KB | 120 KB |
| Can't You See | 7.2 KB | 16.3 KB | 82 KB | **200 KB** |

At quality 50, Can't You See's 1080 drops to 133 KB, and at 40 to 61 KB. Its grain is expensive to encode. The first-load budget is 350 KB, and the homepage's JS and fonts already take about 217 KB of it, so the hero's cover size matters. Open question 3 covers it.

### Keys and hashing

The keys follow SPEC-cloudflare-infra.md:

| File | Key | Example |
|---|---|---|
| Snippet | `snippets/<trackId>.<hash>.m4a` | `snippets/welcome-to-vapor-city.3f9a1c2e.m4a` |
| Cover | `covers/<releaseId>.<hash>.<width>.<format>` | `covers/cant-you-see-ep.9b04d7aa.768.avif` |

- `<hash>` is the first 8 hex characters of a SHA-256. For a snippet, it's over the encoded file. For a cover, it's over all eight encoded files in a fixed order, so every size and format of one cover shares one hash.
- **The same inputs and settings give the same keys**, so re-running `add-song` is safe. Any change to the master, start, fades, cover or encoder settings gives new keys, and old ones are never overwritten.
- Ids are kebab-case ASCII, made from the title: "Welcome to Vapor_City" becomes `welcome-to-vapor-city`, and "Can't You See" becomes `cant-you-see`. An EP's or album's release id takes `-ep` or `-album` on the end, so it never clashes with its title track. A single's release id is its track's id. `--id` and `--release-id` override them. **Ids don't change once published.**

### Upload and verify

- Each file goes up with `npx wrangler r2 object put thesamegatsby-media/<key> --file <path> --content-type <type> --cache-control "public, max-age=31536000, immutable" --remote`. The types are `audio/mp4`, `image/avif` and `image/webp`. Wrangler is authenticated with `wrangler login` (OAuth), so **there are no R2 keys and nothing secret** (SPEC-cloudflare-infra.md).
- Before uploading, `add-song` runs `npx wrangler whoami` and stops if Wrangler isn't logged in.
- After uploading, it sends a `HEAD` to `https://media.thesamegatsby.com/<key>` for every file. Each must return `200` with the right `content-type`, the immutable `cache-control`, and a `content-length` equal to the staged file's size. Any miss stops the run before the catalogue is written.
- External commands run through `execFile` with argument arrays, never a shell string, so a title or path with quotes or spaces can't break out.

## The catalogue

`src/catalogue/songs.json` replaces `songs/index.ts`. It's JSON so a script can rewrite it deterministically: 2-space indent, a trailing newline, and releases newest first. Its types, validation and URL helpers sit beside it.

```ts
// src/catalogue/types.ts
// The same ids as design-system's view types, which site's mapping relies on.
// They're declared again here because media-pipeline doesn't depend on design-system.
export type PlatformId =
  | "spotify" | "apple-music" | "youtube-music" | "soundcloud" | "bandcamp"
  | "amazon-music" | "deezer" | "tidal";
export type ReleaseType = "single" | "ep" | "album";
export type TrackKind = "original" | "remix" | "edit";
export type CoverFormat = "avif" | "webp";

export type Snippet = {
  key: string; // "snippets/welcome-to-vapor-city.3f9a1c2e.m4a"
  duration: number; // seconds, read back from the encoded file: 30.00
  bytes: number;
  start: number; // where it was cut from the master, in seconds, so a re-cut can start from it
  fadeIn: number;
  fadeOut: number;
};

export type Cover = {
  key: string; // "covers/cant-you-see-ep.9b04d7aa", the stem every size shares
  widths: readonly number[]; // [192, 384, 768, 1080]
  formats: readonly CoverFormat[]; // ["avif", "webp"]
};

export type CatalogueTrack = { id: string; title: string; kind: TrackKind; snippet: Snippet };

export type CatalogueRelease = {
  id: string;
  type: ReleaseType;
  title: string;
  date: string; // "2025-10-03", the release date, which orders the list
  cover: Cover;
  tracks: readonly CatalogueTrack[]; // in tracklist order
  leadTrackId: string;
  featured?: true; // the hero shows this release instead of the newest
  links: readonly { platform: PlatformId; url: string }[];
};

export type Catalogue = { releases: readonly CatalogueRelease[] };
```

```ts
// src/catalogue/media.ts
export const MEDIA_ORIGIN = "https://media.thesamegatsby.com";

export const snippetUrl = (snippet: Snippet) => `${MEDIA_ORIGIN}/${snippet.key}`;
export const coverUrl = (cover: Cover, width: number, format: CoverFormat) =>
  `${MEDIA_ORIGIN}/${cover.key}.${width}.${format}`;
export const coverSrcSet = (cover: Cover, format: CoverFormat) =>
  cover.widths.map((width) => `${coverUrl(cover, width, format)} ${width}w`).join(", ");
```

`src/catalogue/index.ts` exports `catalogue`, typed through `parseCatalogue()`. That throws on invalid data, so a bad hand edit fails `next build` as well as the tests. `site` imports it in a server component, so the validation never ships to the browser. **`site` maps this onto design-system's `Release` and `Track` view types.** That mapping is `site`'s code, not this module's.

### Who edits what

- **Pipeline-owned:** `snippet` and `cover`. They're only ever written by `add-song`, because a hand edit would point at a key that may not exist.
- **Hand-editable:** titles, `date`, `featured`, `leadTrackId`, track order, `kind` and `links`. Hand edits are checked by the same validation.

### Validation

`parseCatalogue()` and `tests/catalogue.test.ts` check:
- Ids are kebab-case. Release ids are unique, and **track ids are unique across the whole catalogue**, since `audio-engine` plays by track id.
- A single has exactly one track. An EP or album has two or more.
- `leadTrackId` names one of the release's own tracks. At most one release is `featured`.
- Dates are real ISO dates, and releases run newest first.
- Every key matches its pattern, with the track's or release's own id in it.
- Each snippet's duration is 30 s, ± 0.05 s.
- Each link is `https`, each platform appears at most once, and its host is that platform's:
  - Spotify `open.spotify.com`, Apple Music `music.apple.com`, YouTube Music `music.youtube.com` or `www.youtube.com`
  - SoundCloud `soundcloud.com`, Bandcamp `*.bandcamp.com`, Amazon Music `music.amazon.*`
  - Deezer `www.deezer.com` or `link.deezer.com`, Tidal `tidal.com` or `listen.tidal.com`
- No link carries a tracking parameter (`si`, `utm_*`). `add-song` strips them from the URLs it's given, as the `/system` fixture already does by hand.
- No URL anywhere uses `r2.dev`.

## Commands

```bash
# The dates, start seconds and links below are illustrative, not the real ones

# A new single
npm run add-song -- --master ~/Masters/vapor-city.wav --start 62.5 \
  --cover ~/Art/vapor-city.png --title "Welcome to Vapor_City" --date 2025-10-03 \
  --spotify https://open.spotify.com/track/… --bandcamp https://thesamegatsby.bandcamp.com/track/…

# The first track of an EP creates the release. Later tracks join it by id
npm run add-song -- --type ep --release-title "Can't You See" --cover ~/Art/cys.png --date 2024-03-29 \
  --master ~/Masters/cant-you-see.wav --start 41 --title "Can't You See"
npm run add-song -- --release cant-you-see-ep --master ~/Masters/ukg-333.wav --start 33 --title "UKG 333"

# Build and stage only: no upload, no catalogue write. Prints the keys, sizes and the catalogue diff
npm run add-song -- --dry-run …
afplay .media/snippets/welcome-to-vapor-city.3f9a1c2e.m4a   # listen before uploading

# HEAD every key in the catalogue on the media domain
npm run check-media
```

| Flag | Meaning |
|---|---|
| `--master <file>`, `--start <s>`, `--title <text>` | Required for every track. `--start` takes seconds (`62.5`) or `m:ss.s` (`1:02.5`) |
| `--kind original\|remix\|edit` | Default `original` |
| `--fade-in <s>`, `--fade-out <s>` | Override the default fades for this snippet |
| `--id <slug>` | Override the track id |
| `--release <id>` | Add the track to an existing EP or album. Without it, a new release is made |
| `--type single\|ep\|album` | For a new release. Default `single` |
| `--release-title <text>`, `--release-id <slug>` | For a new EP or album. A single takes its track's title and id |
| `--cover <file>`, `--date YYYY-MM-DD` | Required for a new release |
| `--crop` | Centre-crop a cover that isn't square |
| `--cover-quality <0–100>` | Override the AVIF quality for this release's cover. Default 50 |
| `--lead` | Make this track the release's lead. The first track added is the lead by default |
| `--featured` | Feature this release in the hero, and clear any other release's flag |
| `--spotify`, `--apple-music`, `--youtube-music`, `--soundcloud`, `--bandcamp`, `--amazon-music`, `--deezer`, `--tidal` `<url>` | The release's links. They can also be added to `songs.json` by hand later |
| `--replace` | Re-cut an existing track (a new start or fades), or give an existing release a new cover. Without it, an existing id is refused |
| `--dry-run` | Build and stage into `.media/`, then stop |

`npm run check-media` isn't part of `npm run ci`, because it needs the network, and an edge hiccup shouldn't block a deploy. It's run after `add-song`, and again at cutover.

## The five current releases

Re-cut from their masters with `add-song`, once Reno has given me the inputs below.

| Release | Type | Tracks | Cover | To sort out |
|---|---|---|---|---|
| Welcome to Vapor_City | single | 1 | 1080² PNG | Exactly at the 1080 px minimum |
| Give me that KaiZen | single? | 1? | 1469 × 1457 PNG | **Not square:** a square export, or `--crop`, which loses 12 px. **Its Spotify link is an album, its SoundCloud link is a set and its YouTube link is track 2 of a playlist, so it may hold more than one track** |
| You who could be Forever | single | 1 | 2500² PNG | — |
| Can't You See | EP | Can't You See, UKG 333 | 2048² PNG | Its Apple Music link points at the song, not the EP |
| Bring That Change | single | 1 | SVG around a raster | `sips` renders it at 1600², but the original artwork file would be better |

**Inputs I need from Reno:**
- Where the six WAV masters are on the Mac. They never enter the repo.
- A start second for each track. `--dry-run` and `afplay` let him audition a cut before anything uploads.
- Each release's date.
- The release-level URLs for all eight platforms where the release is on them. Bandcamp, Amazon Music, Deezer and Tidal have never been collected, and the YouTube links point at `www.youtube.com` videos rather than YouTube Music. If he'd rather, I can read the dates and links off the public platform pages and give him the list to check.
- Give me that KaiZen's real type and tracklist.
- Square source art for Give me that KaiZen and Bring That Change, if he has it.

## Repo changes in this module

- Add `scripts/add-song.ts`, `scripts/check-media.ts` and `scripts/media/` (WAV, fades, MP4 boxes, covers, keys, upload, arguments), plus the `add-song` and `check-media` scripts in `package.json`, both run as `node scripts/<name>.ts`.
- Add `src/catalogue/` (`songs.json`, `types.ts`, `validate.ts`, `media.ts`, `index.ts`).
- Point the placeholder `src/app/page.tsx` at `src/catalogue`, then delete `songs/index.ts` and `public/music/`. That takes 21 MB out of every build.
- Add `.media/` to `.gitignore`.
- **No new dependencies.** It uses Wrangler, which CF-2 adds, and tools already on the Mac.

## Code style

SPEC.md's rules apply. On top of them:
- Scripts are plain TypeScript run by Node's type stripping, so no enums, namespaces or parameter properties.
- Pure functions in `scripts/media/*.ts` do the work, and only the two entry scripts touch the filesystem, child processes and network.

```ts
// scripts/media/encode.ts
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const run = promisify(execFile);

// Apple's AAC encoder, which writes moov before mdat, so no faststart pass is needed.
export async function encodeAac(wav: string, out: string): Promise<void> {
  await run("afconvert", ["-f", "m4af", "-d", "aac", "-b", "160000", "-s", "2", "-q", "127", wav, out]);
}
```

## Testing strategy

Workers Builds runs `npm run ci` on Linux, with no `afconvert` or `sips`. So the logic that matters is pure and tested anywhere, and the tool calls are thin.

| Level | What | How |
|---|---|---|
| Unit | WAV read and write, the cut, the fade curve's endpoints and shape, the MP4 box walk (`moov` before `mdat`) and timestamp zeroing on a small hand-built byte fixture, ids, hashes and keys, argument parsing, the catalogue merge (new release, joining an EP, `--replace`, `--featured`), link host checks and tracking-parameter stripping, the validation rules, URL helpers | `npm test` |
| Catalogue | The committed `songs.json` passes `parseCatalogue()` | `npm test` |
| Integration (Mac only) | A generated 40 s test tone goes through the real `afconvert` and `sips`. The result is 30 s, `moov` first, byte-identical on a second run, with near-silent first and last samples | `npm test`, skipped where `process.platform !== "darwin"` |
| Edge | Every catalogue key is live with the right headers. Cache `HIT`, `206` on a range and CORS on a real snippet | `npm run check-media`, and the media checks in `scripts/check-edge.sh` |
| Manual | Reno listens to each re-cut snippet before it uploads, and looks at the covers at each width | `--dry-run`, `afplay` and Quick Look |

## Boundaries

**Always**
- Run `--dry-run` before a real run, and keep the order: build, upload, verify, then write the catalogue.
- Set `Content-Type` and the immutable `Cache-Control` on every upload.
- Refuse rather than guess: a short master, a cover that isn't square or is too small, a duplicate id, a missing date or a link on the wrong host stops the run with a message saying what to fix.

**Ask first**
- **Every real upload when I run it.** `--dry-run` needs no ask. A real run uploads to R2, which SPEC.md makes an ask-first step, so I ask Reno before each batch.
- Deleting anything from R2.
- Installing ffmpeg or any other tool, or adding a dependency.
- Changing the encode settings, widths or formats after the five releases are published, since that renames every file.
- Changing the catalogue's shape once `audio-engine` or `site` reads it.

**Never**
- Commit masters, `.media/` or source artwork.
- Overwrite an existing key with different bytes.
- Put an `r2.dev` URL, a local file path or a secret in the catalogue.
- Create R2 API tokens. Wrangler's OAuth login is the only credential.

## Acceptance criteria

- [ ] `add-song --dry-run` on a WAV produces a snippet that:
  - is AAC-LC, at a bit rate between 150 and 170 kbps by `afinfo`
  - is 30 s ± 0.05 s long
  - has `moov` before `mdat`, with its first audio frame inside the first 16 KB (the infra spec's range check fetches `bytes=0-16383`)
  - decodes back with its first and last 10 ms below −60 dBFS, and the fades at their set lengths
- [ ] Two runs on the same inputs give byte-identical files and the same keys.
- [ ] The covers come out at 192, 384, 768 and 1080 px, square, in AVIF and WebP, sRGB, with no EXIF or GPS. A non-square cover is refused without `--crop`, and a cover under 1080 px is refused.
- [ ] A run that fails at any step leaves `songs.json` byte-identical. A bad argument or input stops it before anything uploads.
- [ ] A real run uploads every file. Each one returns `200` from `media.thesamegatsby.com` with the right `content-type`, the immutable `cache-control` and the staged size. `npm run check-media` passes, and the media checks in `scripts/check-edge.sh` pass on a real snippet.
- [ ] `songs.json` holds the five releases and six tracks, re-cut from the masters, with every platform link Reno has, and it passes validation.
- [ ] `songs/index.ts` and `public/music/` are gone. Nothing references `/music/`, and `out/` is about 21 MB smaller.
- [ ] The unit tests pass on Linux without the macOS tools, and the integration test runs on the Mac.
- [ ] `npm run ci` passes.

## Out of scope for this module

- Playing anything (`audio-engine`), and laying covers out on the page, including the `sizes` the hero uses (`site`).
- The Open Graph image and favicon (`site`).
- `/system`'s fixture covers, which stay local (open question 4).
- The old site's `public/background.webp` and `public/profile_pic.jpg` (3.8 MB), which `site` keeps or removes.
- Deleting objects that a re-cut or new cover leaves behind in R2. They're small, immutable and unreferenced.
- Full-length audio, loudness normalisation (open question 5), waveform data, ISRCs, credits beyond the title, and lyrics.
- A web upload page or CMS (SPEC.md, out of scope).

## Open questions

All seven were answered on 4 Nov 2026: Reno accepted every recommendation. They stay here as the record of why the spec reads as it does.

1. **Fade lengths. Decided: 0.15 s in, 2 s out**, overridable per song. The cut usually lands on a beat or a drop, so a long fade-in would blunt it and work against "play feels instant". 0.15 s removes the click without being heard as a fade, and two seconds out lets the snippet end gently rather than stop.
2. **The cover fallback. Decided: WebP through `cwebp`**, which keeps the infra spec's AVIF + WebP keys. AVIF covers almost every browser, and WebP catches the rest at about AVIF's size: at 1080 px, 65 KB against 58 KB for Vapor_City. `cwebp` is installed through Homebrew but isn't part of macOS, so `add-song` checks for it and stops with `brew install webp` if it's missing. It never installs anything itself. JPEG through `sips` (2–4× bigger: Can't You See at 1080 is 477 KB) and no fallback at all were the alternatives.
3. **Cover quality. Decided: AVIF at 50 by default, with a `--cover-quality` override per release.** At 60, Can't You See's 1080 is 200 KB, almost two-thirds of what the first-load budget has left after JS and fonts. At 50 it's 133 KB, and the other four are well under 100 KB. Reno checks the five releases by eye at that setting before anything uploads. Whether phones fetch 768 or 1080 for the hero is `site`'s call, through `sizes`, measured against the 350 KB budget.
4. **`/system`'s covers. Decided: it keeps its own local fixture covers.** The design-system spec says real covers come from `media-pipeline`, but a test bench that works offline, gives the same screenshots every time and runs before the bucket exists is worth more than real files there. Real covers show up on `/` through `site`.
5. **Loudness. Decided: no normalisation.** The masters are already mastered, and changing their level changes the art. Phones set the volume anyway. `add-song` prints each snippet's peak level, so a clipping cut gets noticed.
6. **Encoder settings and tooling. Decided: 160 kbps constrained VBR, Apple's encoder, through `afconvert`, with no ffmpeg.** SPEC.md's tech stack now says so.
7. **Order of work against `cloudflare-infra`. Decided: the pipeline is built and tested up to `--dry-run` first, then the plan stops for CF-1 (the zone), CF-2 (Wrangler) and CF-3 (the bucket, domain and rules) before the first real upload.** `audio-engine` can't be tested on real snippets until that's done.
