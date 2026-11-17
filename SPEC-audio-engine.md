# Spec: audio-engine

Module of the [Déjà Gatsby rebuild](SPEC.md). Depends on `media-pipeline` for the snippets on `media.thesamegatsby.com` and the catalogue that names them. `site` wires it to the `design-system` components.

Approved by Reno on 17 Nov 2026, as drafted, with all six open questions answered as recommended.

## Objective

A fan taps a track and hears it almost at once. The engine is the code between that tap and the sound. It has no UI of its own:
- **One shared `<audio>` element**, so two snippets can never play over each other.
- **Fast start:** sound within 300 ms of the tap, on DevTools' "Fast 4G" with a 4× CPU throttle and the snippet in Cloudflare's edge cache (SPEC.md, success criteria).
- **Preload on intent:** it starts fetching a snippet when a finger lands on its row, before the tap completes.
- **One snippet at a time, then stop.** It plays 30 s once and ends there: no loop, no queue, no next track.
- **Media Session**, so the lock screen and the phone's media controls show the title, Déjà Gatsby and the cover.

It reports one small state (which track, loading, playing or ended, how far in), which `site` maps onto the components' props. **Who it's for:** the fan, through `site`. Reno never touches it when adding a song.

## What exists today (checked 17 Nov 2026)

| | |
|---|---|
| Snippets | Six on the media domain, AAC-LC at 158–168 kbps, 30.000 s, the 2 s fades and the loudness match baked in. In every one, `moov` comes first and the first audio frame is at byte 8,192 (Checkpoint 11) |
| Edge | Cached at the edge (`HIT` on a second request), `206` on `Range: bytes=0-16383`, and `access-control-allow-origin: *` on cached copies (`scripts/check-edge.sh`) |
| Catalogue | `src/catalogue/songs.json`: five releases, six tracks. Track ids are unique across the catalogue, so the engine plays by track id. `snippetUrl()` and `coverUrl()` build the URLs |
| Components | Presentational, never importing the engine. `TrackRow` takes `idle \| loading \| playing \| played`, `ReleaseRow` and `ReleaseHero` take `playingTrackId`, `playState` and `elapsed`, and `NowPlayingBar` takes `loading \| playing \| ended` with `onStop`, `onReplay` and `onClose` |
| Code | No `src/audio/` yet. **Howler and `@types/howler` are still in `package.json`**, and nothing imports them |

## How it plays

### The element

- **One `HTMLAudioElement`, made with `new Audio()` the first time it's needed**, and never put in the DOM. It doesn't exist during the static build or before the page runs, so nothing touches `window` when the module is imported.
- **No `crossorigin` attribute.** Playback then doesn't depend on CORS, as SPEC.md decided. CORS stays on the media domain for the release kit's canvas.
- **No Web Audio, no volume and no JS fades.** The fades and loudness are baked into the file. iPhones ignore `volume` on media elements, and the ring/silent switch mutes Web Audio.
- **`play()` is called synchronously inside the tap handler**, with nothing awaited before it. iOS only lets a page start sound from inside the user's gesture.
- **Duration comes from the catalogue** (30 s), not from the element, which reads `NaN` until the metadata arrives. `elapsed` comes from `timeupdate`, about four times a second, held between 0 and the duration.

### Fast start

Three things stack, cheapest first:

1. **Preconnect to the media domain.** `site` puts `<link rel="preconnect" href="https://media.thesamegatsby.com">` in the head, **with no `crossorigin`**, so it opens the same kind of connection the element will use. That saves the DNS, TCP and TLS round trips on the first tap.
2. **Preload on intent.** `intent(trackId)` runs on `pointerdown`, and on keyboard focus of a play control. If nothing is playing, it points the element at that snippet with `preload="auto"`, so the fetch starts while the finger is still down. If something is playing, it does nothing, so a touch never cuts off the current snippet. The tap that follows plays whatever is loaded.
3. **Warm the hero's lead track** (open question 3, decided yes). Once the page has loaded and gone idle, the engine points the element at the hero's lead track with `preload="metadata"`. That fetches the first range, which holds the `moov` index and the first audio, so the most likely first tap needs no new request.

### The state

```ts
// src/audio/state.ts
export type Phase = "loading" | "playing" | "ended";

// null until the first tap. trackId stays set after Close, so its row keeps
// the played look, as TrackRow's spec draws it.
export type Playback = {
  trackId: string;
  phase: Phase;
  elapsed: number;
  duration: number;
  barOpen: boolean;
  failed: boolean;
} | null;
```

| Event | From | To |
|---|---|---|
| `play(id)`, a tap | anything | `loading` on `id`, elapsed 0, bar open. A different track stops first |
| element `playing` | `loading` | `playing` |
| element `waiting` | `playing` | `loading`, so the readout shows the load glyph while it buffers |
| `timeupdate` | `playing` | `playing`, elapsed updated |
| element `ended` | `playing` | `ended`, elapsed = duration |
| `stop()`, the playing row or the bar's Stop | `playing` | `ended`, bar open (open question 1) |
| `stop()` | `loading` | `null`: a tap that's cancelled before a sound leaves nothing behind |
| `replay()` | `ended` | `loading` from 0 |
| `close()` | `ended` | `ended`, bar closed |
| a pause the engine didn't ask for (a call, another app, the lock screen) | `playing` | `ended`, as a stop (open question 2) |
| element `error`, or 10 s in `loading` | `loading`, `playing` | `ended`, `failed: true` (open question 4) |

`site` maps it onto the components:

| Engine | `TrackRow` / `playState` | `NowPlayingBar` |
|---|---|---|
| `null` | every row `idle` | hidden |
| `loading` on `id` | `id` is `loading` | `loading` |
| `playing` on `id` | `id` is `playing` | `playing` |
| `ended` on `id`, bar open | `id` is `played` | `ended` |
| `ended` on `id`, bar closed | `id` is `played` | hidden |

Tapping the loading or playing row calls `stop()`. Tapping any other row, or a played one, calls `play()`.

**Only the latest tap counts.** Each `play()` bumps a counter, and events from an earlier source are dropped, so fast tapping between rows ends on the last track tapped with its own state. The `AbortError` that a superseded `play()` promise rejects with is expected, and ignored.

### Media Session

Where `navigator.mediaSession` exists, each `play()` sets:
- **Metadata:** the track title, "Déjà Gatsby" as the artist, the release title as the album, and the cover's WebP at 192, 384 and 768 px as artwork.
- **Handlers:** `play` replays, and `pause` and `stop` stop. `seekto`, `seekbackward`, `seekforward`, `previoustrack` and `nexttrack` are set to `null`, so the lock screen offers no seeking and no skipping: there's nothing to skip to.
- **Position:** `setPositionState()` with the catalogue's duration, so the lock screen's bar matches the page's tape.

### What the engine exposes

```ts
// src/audio/engine.ts
export type EngineTrack = { id: string; src: string; title: string; album: string; artwork: MediaImage[]; duration: number };

export type AudioEngine = {
  play(trackId: string): void; // call inside the tap handler
  stop(): void;
  replay(): void;
  close(): void;
  intent(trackId: string): void; // pointerdown or focus: start the fetch
  warm(trackId: string): void; // after load: fetch the first range only
  subscribe(listener: () => void): () => void;
  getSnapshot(): Playback;
};

export function createAudioEngine(tracks: readonly EngineTrack[], env?: EngineEnv): AudioEngine;
```

- `useAudioEngine()` in `src/audio/use-audio-engine.ts` reads it through React's `useSyncExternalStore`, with `null` on the server.
- `env` carries the element factory, `navigator.mediaSession`, the clock and timers, so the tests pass fakes.
- **`src/audio/tracks.ts` builds `EngineTrack`s from the catalogue.** `site` calls it in a server component and passes the result to the client as props. **The client never imports `src/catalogue/index.ts`**, so the catalogue's validation never ships to the browser, as that file's comment promises.

## Repo changes in this module

- Add `src/audio/` (`state.ts`, `engine.ts`, `media-session.ts`, `tracks.ts`, `use-audio-engine.ts`, `index.ts`) and `tests/audio-*.test.ts`.
- **Remove `howler` and `@types/howler`** from `package.json` (SPEC.md, assumption 3). SPEC-design-system.md's note that Howler stays until `audio-engine` replaces it is then out of date, and gets removed.
- **Add an unlinked `/bench` route** (`src/app/bench/page.tsx`, `noindex`) listing the six tracks as plain buttons wired to the engine, showing its state and timing each tap to `playing` (open question 5). It's muted by default, with an unmute checkbox for the phone checks, since measuring needs the `playing` event and not sound. It's how the success criteria get measured before `site` exists.
- **No new dependencies.**

## Code style

SPEC.md's rules apply. On top of them:
- The state changes are a pure function, `next(state, event)`, in `state.ts`. Only `engine.ts` touches the element, timers and Media Session.
- Every file under `src/audio/` is `.ts`, since Node's test runner can't import `.tsx`. The engine has no JSX.

```ts
// src/audio/state.ts
export function next(state: Playback, event: EngineEvent): Playback {
  switch (event.type) {
    case "play":
      return { trackId: event.trackId, phase: "loading", elapsed: 0, duration: event.duration, barOpen: true, failed: false };
    case "stop":
      // Cancelling before any sound leaves nothing to show as played.
      return state?.phase === "loading" ? null : state && { ...state, phase: "ended" };
    // …
  }
}
```

## Testing strategy

| Level | What | How |
|---|---|---|
| Unit | Every row of the state table, including the stale-event guard, the 10 s load timeout and a superseded `play()` rejecting with `AbortError`. `tracks.ts` against the committed catalogue (six tracks, URLs on the media domain, artwork at 192, 384 and 768) | `npm test` |
| Engine | `createAudioEngine` with a fake element (an `EventTarget` with `src`, `preload`, `currentTime`, `paused` and a `play()` that returns a promise) and a fake `mediaSession`. Checks `play()` reaches the element synchronously, `intent()` never changes the source while something plays, and Media Session gets the metadata and the `null` handlers | `npm test` |
| Static | Importing `src/audio/index.ts` in Node with no `window` doesn't throw. `next build` passes | `npm test`, `npm run ci` |
| Browser | Tap to `playing` on `/bench`, on the deployed preview, under DevTools' "Fast 4G" and 4× CPU, with the snippet a cache `HIT`. Five taps per case, median and worst recorded | Chrome DevTools MCP against the preview |
| Phone | Reno on his iPhone: sound on the first tap, the lock screen's title, artist and cover, pause from the lock screen, a call interrupting, and the silent switch on | Manual, on `/bench` |

## Boundaries

**Always**
- Call `play()` synchronously from the tap. Never put a `fetch`, a timer or an `await` in front of it.
- Leave the element without `crossorigin`, and keep the preconnect without it too, so the two share one connection.
- Keep one element for the whole page.

**Ask first**
- Adding a dependency, including any audio library.
- Adding Playwright or another browser test framework (SPEC.md).
- Anything that plays sound without a tap, beyond the metadata-only warm-up.
- Changing a component's props to fit the engine. `site` maps the engine's state onto the existing ones.

**Never**
- Autoplay, a queue, a loop, seeking or full-track playback (SPEC.md, out of scope).
- Web Audio for playback, or JS fades and volume.
- Import `src/catalogue/index.ts` or the design-system components from `src/audio/`.
- Play audio on Reno's Mac with `afplay` or the browser pane while testing. Reno listens on his own devices.

## Success criteria

- [ ] **Tap to `playing` under 300 ms**, median of five, on the deployed `/bench` under "Fast 4G" and 4× CPU, with the snippet a cache `HIT`. Three cases are measured and recorded:
  - the warmed hero lead track, tapped 5 s after load
  - another track, with `intent()` firing on `pointerdown`
  - a track tapped 30 s after load, after the preconnect may have gone idle. This case is recorded either way; if it misses, the fix is an open question rather than a quiet pass
- [ ] Tapping one track while another plays stops the first within the same tap. Fast tapping across all six rows ends on the last one tapped, and the state names it.
- [ ] A snippet ends at 30 s on `ended`, and nothing else starts.
- [ ] Stop, Replay and Close move through the state table as written, checked in unit tests and on `/bench`.
- [ ] A missing file or a dropped connection reaches `failed` within 10 s, never stuck loading.
- [ ] On Reno's iPhone: the first tap makes sound with the silent switch on, the lock screen shows the title, Déjà Gatsby and the cover, has no skip or seek buttons, and its pause stops the snippet.
- [ ] Howler is gone from `package.json`, and nothing imports it.
- [ ] `src/audio/` adds under 3 KB (minified and gzipped) to the JS that `/bench` loads.
- [ ] `npm run ci` passes.

## Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Safari probes a media file with a tiny range before the real one, costing a round trip on iPhones | Medium: iOS is most fans | The metadata warm-up and `intent()` take that probe before the tap. Measured on Reno's iPhone in the phone checks |
| A preconnect that isn't used in its first few seconds can be closed by the browser | Medium: the 30 s case misses 300 ms | The warm-up makes a real request, which keeps the connection in use. The 30 s case measures it |
| `pointerdown` then a scroll, not a tap, fetches a snippet nobody plays | Low: about 600 KB on a fan's data | Only while nothing plays, and the fetch stops when the next `play()` changes the source |
| `waiting` fires mid-play on a slow connection and the readout flickers between load and play | Low | It shows the truth. If it looks wrong on `/bench`, a short debounce is a one-line change |

## Out of scope for this module

- Wiring the homepage, the preconnect tag, and mapping the state onto the components (`site`). `/bench` uses plain buttons.
- What a failed snippet looks like on the page (open question 4 decides the state; `site` draws it).
- Analytics on plays (SPEC.md, out of scope).
- A visualiser or anything built on Web Audio.

## Open questions

All six were answered on 17 Nov 2026: Reno accepted every recommendation. They stay here as the record of why the spec reads as it does.

1. **Stop mid-snippet. Decided: the bar goes to its ended look** (Replay, Close, the stream buttons lit) and the row reads played, the same as a snippet that ran to the end. A fan who stops is still at the moment to convert. The alternative is for Stop to close the bar, leaving Close with nothing to do.
2. **Lock-screen pause. Decided: it stops, as Stop does**, and the lock screen's play replays from the start. The page has no paused state to show, and a snippet is too short to resume.
3. **Warm the hero's lead track after load. Decided: yes, metadata only.** It's one range request, about 8–16 KB, made on every visit whether or not anyone taps. It doesn't count against the 350 KB first-load budget because it runs after load, but it's real data on a fan's plan.
4. **A snippet that fails. Decided: show the ended bar**, so the stream buttons are still there and the fan can hear the full track anyway, with no new design. The alternative is a new error look on `TrackRow` and `NowPlayingBar`, which would mean a design-system change and a canvas check.
5. **The `/bench` route. Decided: add it in this module, unlinked and `noindex` like `/system`**, and delete it in `site` once the homepage carries the same measurements. Without it, nothing can measure the 300 ms target until `site` is built.
6. **Stop the snippet when a stream link is followed. Decided: yes.** On desktop the new tab would otherwise play the full track over the snippet. On a phone the streaming app usually interrupts it anyway. It's one `stop()` call in `site`'s wiring, so this answer goes into SPEC-site.md.
