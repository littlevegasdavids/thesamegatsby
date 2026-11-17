import assert from "node:assert/strict";
import { beforeEach, describe, test } from "node:test";
import { createAudioEngine } from "../src/audio/engine.ts";
import type { AudioEngine, EngineEnv } from "../src/audio/engine.ts";
import { ARTIST, SKIPPED_ACTIONS } from "../src/audio/media-session.ts";
import type { MediaSessionLike, SessionEnv } from "../src/audio/media-session.ts";
import type { EngineTrack } from "../src/audio/tracks.ts";
import { FakeAudio } from "./support/fake-audio.ts";

const ART = [{ src: "https://media.thesamegatsby.com/covers/x.0123abcd.192.webp", sizes: "192x192", type: "image/webp" }];
const TRACKS: EngineTrack[] = [
  { id: "cys", src: "https://media.thesamegatsby.com/snippets/cys.0123abcd.m4a", title: "Can't You See", album: "Can't You See", artwork: ART, duration: 30 },
  { id: "ukg", src: "https://media.thesamegatsby.com/snippets/ukg.0123abcd.m4a", title: "UKG 333", album: "Can't You See", artwork: ART, duration: 30 },
];

// Records what the engine asks of navigator.mediaSession. A browser throws
// on an action it doesn't know, which `refuse` imitates.
class FakeSession implements MediaSessionLike {
  metadata: unknown = null;
  playbackState = "none";
  handlers = new Map<string, (() => void) | null>();
  positions: { duration: number; position: number; playbackRate: number }[] = [];
  refuse = new Set<string>();

  setActionHandler(action: string, handler: (() => void) | null) {
    if (this.refuse.has(action)) throw new TypeError(`"${action}" isn't a valid MediaSessionAction`);
    this.handlers.set(action, handler);
  }
  setPositionState(state: { duration: number; position: number; playbackRate: number }) {
    this.positions.push(state);
  }
}

let audio: FakeAudio;
let session: FakeSession;
let engine: AudioEngine;

const envWith = (sessionEnv: SessionEnv | undefined): EngineEnv => ({
  createElement: () => (audio = new FakeAudio()),
  setTimeout: () => 0,
  clearTimeout: () => {},
  mediaSession: sessionEnv,
});

beforeEach(() => {
  session = new FakeSession();
  // The metadata factory stands in for `new MediaMetadata(init)`.
  engine = createAudioEngine(TRACKS, envWith({ session, metadata: (init) => ({ ...init }) }));
});

describe("on each play", () => {
  test("shows the track, Déjà Gatsby, the release and the cover", () => {
    engine.play("ukg");
    assert.equal(ARTIST, "Déjà Gatsby");
    assert.deepEqual(session.metadata, { title: "UKG 333", artist: "Déjà Gatsby", album: "Can't You See", artwork: ART });
  });

  test("sets the position from the catalogue's duration, at 0", () => {
    engine.play("cys");
    assert.deepEqual(session.positions.at(-1), { duration: 30, position: 0, playbackRate: 1 });
  });

  test("a new track replaces the metadata", () => {
    engine.play("cys");
    engine.play("ukg");
    assert.equal((session.metadata as { title: string }).title, "UKG 333");
  });
});

describe("the playback state the lock screen shows", () => {
  test("is playing while loading or playing, and paused once ended", () => {
    engine.play("cys");
    assert.equal(session.playbackState, "playing");
    audio.emit("playing");
    assert.equal(session.playbackState, "playing");
    engine.stop();
    assert.equal(session.playbackState, "paused");
  });

  test("an end holds the position at the duration", () => {
    engine.play("cys");
    audio.emit("playing");
    audio.runOut();
    assert.deepEqual(session.positions.at(-1), { duration: 30, position: 30, playbackRate: 1 });
  });

  test("a cancelled load clears the lock screen", () => {
    engine.play("cys");
    engine.stop();
    assert.equal(session.playbackState, "none");
    assert.equal(session.metadata, null);
  });
});

describe("the lock screen's buttons", () => {
  test("pause and stop stop the snippet", () => {
    for (const action of ["pause", "stop"]) {
      engine.play("cys");
      audio.emit("playing");
      session.handlers.get(action)!();
      assert.equal(engine.getSnapshot()?.phase, "ended", action);
    }
  });

  test("play replays the ended snippet from the start", () => {
    engine.play("cys");
    audio.emit("playing");
    session.handlers.get("pause")!();
    session.handlers.get("play")!();
    assert.equal(engine.getSnapshot()?.phase, "loading");
    assert.equal(audio.currentTime, 0);
  });

  test("there's no seeking and no skipping", () => {
    engine.play("cys");
    assert.deepEqual(SKIPPED_ACTIONS, ["seekto", "seekbackward", "seekforward", "previoustrack", "nexttrack"]);
    for (const action of SKIPPED_ACTIONS) {
      assert.ok(session.handlers.has(action), `${action} set`);
      assert.equal(session.handlers.get(action), null, `${action} is null`);
    }
  });

  test("an action the browser refuses is skipped, and the rest are still set", () => {
    session.refuse.add("seekto");
    session.refuse.add("stop");
    assert.doesNotThrow(() => engine.play("cys"));
    assert.equal(typeof session.handlers.get("pause"), "function");
    assert.equal(session.handlers.get("nexttrack"), null);
  });
});

test("with no Media Session, playing works and nothing throws", () => {
  const plain = createAudioEngine(TRACKS, envWith(undefined));
  plain.play("cys");
  audio.emit("playing");
  plain.stop();
  assert.equal(plain.getSnapshot()?.phase, "ended");
});

test("a session without setPositionState still gets its metadata", () => {
  const bare = { metadata: null as unknown, setActionHandler: () => {} };
  const plain = createAudioEngine(TRACKS, envWith({ session: bare, metadata: (init) => init }));
  assert.doesNotThrow(() => plain.play("cys"));
  assert.equal((bare.metadata as { title: string }).title, "Can't You See");
});
