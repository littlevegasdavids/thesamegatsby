import assert from "node:assert/strict";
import { beforeEach, describe, test } from "node:test";
import { LOAD_TIMEOUT, createAudioEngine } from "../src/audio/engine.ts";
import type { AudioEngine, EngineEnv } from "../src/audio/engine.ts";
import type { EngineTrack } from "../src/audio/tracks.ts";
import { FakeAudio } from "./support/fake-audio.ts";

const track = (id: string): EngineTrack => ({
  id,
  src: `https://media.thesamegatsby.com/snippets/${id}.0123abcd.m4a`,
  title: id,
  album: id,
  artwork: [],
  duration: 30,
});
const TRACKS = ["vapor", "kaizen", "forever", "cys", "ukg", "btc"].map(track);
const src = (id: string) => track(id).src;

let elements: FakeAudio[];
let timers: Map<number, () => void>;
let engine: AudioEngine;
let changes: number;

const el = () => elements[0];
const fireTimers = () => {
  const due = [...timers.values()];
  timers.clear();
  for (const fn of due) fn();
};

beforeEach(() => {
  elements = [];
  timers = new Map();
  let id = 0;
  const env: EngineEnv = {
    createElement: () => {
      const audio = new FakeAudio();
      elements.push(audio);
      return audio;
    },
    setTimeout: (fn, ms) => {
      assert.equal(ms, LOAD_TIMEOUT);
      timers.set(++id, fn);
      return id;
    },
    clearTimeout: (handle) => void timers.delete(handle as number),
  };
  engine = createAudioEngine(TRACKS, env);
  changes = 0;
  engine.subscribe(() => changes++);
});

const startPlaying = (id: string) => {
  engine.play(id);
  el().emit("playing");
};

describe("the element", () => {
  test("isn't made until the engine is first used", () => {
    assert.equal(elements.length, 0);
    assert.equal(engine.getSnapshot(), null);
    engine.play("vapor");
    assert.equal(elements.length, 1);
  });

  test("is one element for every track", () => {
    for (const t of TRACKS) startPlaying(t.id);
    engine.intent("kaizen");
    assert.equal(elements.length, 1);
  });
});

describe("play", () => {
  test("sets the source and calls the element's play() before it returns", () => {
    engine.play("vapor");
    assert.equal(el().src, src("vapor"));
    assert.equal(el().preload, "auto");
    assert.deepEqual(el().calls, [`play ${src("vapor")}`]);
    assert.equal(engine.getSnapshot()?.phase, "loading");
  });

  test("goes loading, then playing, then counts elapsed, then ends at 30 s", () => {
    engine.play("vapor");
    el().emit("playing");
    assert.equal(engine.getSnapshot()?.phase, "playing");
    el().currentTime = 12.25;
    el().emit("timeupdate");
    assert.equal(engine.getSnapshot()?.elapsed, 12.25);
    el().runOut();
    assert.deepEqual(engine.getSnapshot(), {
      trackId: "vapor",
      phase: "ended",
      elapsed: 30,
      duration: 30,
      barOpen: true,
      failed: false,
    });
  });

  test("a different track stops the first, then loads", () => {
    startPlaying("vapor");
    engine.play("kaizen");
    assert.deepEqual(el().calls.slice(-2), ["pause", `play ${src("kaizen")}`]);
    assert.equal(engine.getSnapshot()?.trackId, "kaizen");
    assert.equal(engine.getSnapshot()?.phase, "loading");
  });

  test("the same track again starts it from 0 without reloading", () => {
    startPlaying("vapor");
    el().currentTime = 9;
    engine.stop();
    engine.play("vapor");
    assert.equal(el().currentTime, 0);
    assert.ok(!el().calls.some((c) => c.startsWith("load")));
  });

  test("an unknown id throws, naming it", () => {
    assert.throws(() => engine.play("nope"), /"nope"/);
  });

  test("fast taps across all six end on the last one, ignoring the AbortErrors", async () => {
    engine.intent("vapor"); // makes the element, so each play() can be given its promise
    const aborts: (() => void)[] = [];
    for (const t of TRACKS) {
      el().playResult = new Promise((_, reject) => aborts.push(() => reject(Object.assign(new Error("interrupted"), { name: "AbortError" }))));
      engine.play(t.id);
    }
    // A real element rejects every superseded play() when its source changes.
    for (const abort of aborts.slice(0, -1)) abort();
    await new Promise((r) => setImmediate(r));
    assert.equal(engine.getSnapshot()?.trackId, "btc");
    assert.equal(engine.getSnapshot()?.phase, "loading");
    assert.equal(engine.getSnapshot()?.failed, false);
    assert.equal(el().src, src("btc"));
  });

  test("a play() refused for another reason fails the snippet", async () => {
    engine.intent("vapor");
    el().playResult = Promise.reject(Object.assign(new Error("not allowed"), { name: "NotAllowedError" }));
    engine.play("vapor");
    await new Promise((r) => setImmediate(r));
    assert.equal(engine.getSnapshot()?.phase, "ended");
    assert.equal(engine.getSnapshot()?.failed, true);
  });

  test("a refusal from a superseded play() doesn't fail the track that replaced it", async () => {
    engine.intent("vapor");
    let refuse!: () => void;
    el().playResult = new Promise((_, reject) => (refuse = () => reject(Object.assign(new Error("x"), { name: "NotAllowedError" }))));
    engine.play("vapor");
    el().playResult = Promise.resolve();
    engine.play("kaizen");
    refuse();
    await new Promise((r) => setImmediate(r));
    assert.equal(engine.getSnapshot()?.failed, false);
  });
});

// A real element drops a replaced file's queued events itself when its source
// changes (the load algorithm). intent() only moves the element while nothing
// loads or plays, so a file it loaded can't touch the ended track's state.
describe("events from a file intent() loaded change nothing", () => {
  test("an error from the file intent() loaded doesn't fail the ended track", () => {
    startPlaying("vapor");
    el().runOut();
    engine.intent("kaizen");
    el().emit("error");
    assert.equal(engine.getSnapshot()?.failed, false);
    assert.equal(engine.getSnapshot()?.trackId, "vapor");
  });

  test("nor does a playing or timeupdate from it", () => {
    startPlaying("vapor");
    el().runOut();
    const ended = engine.getSnapshot();
    engine.intent("kaizen");
    el().emit("playing");
    el().emit("timeupdate");
    assert.equal(engine.getSnapshot(), ended);
  });
});

describe("pauses", () => {
  test("a pause the engine didn't ask for ends the snippet as a stop", () => {
    startPlaying("vapor");
    el().currentTime = 8;
    el().emit("timeupdate");
    el().paused = true;
    el().emit("pause");
    assert.equal(engine.getSnapshot()?.phase, "ended");
    assert.equal(engine.getSnapshot()?.elapsed, 8);
  });

  test("the pause a real element fires just before ended isn't an interruption", () => {
    startPlaying("vapor");
    el().runOut();
    assert.equal(engine.getSnapshot()?.elapsed, 30);
  });

  test("its own stop() changes the state once, not again on the pause event", () => {
    startPlaying("vapor");
    changes = 0;
    engine.stop();
    assert.ok(el().calls.includes("pause"));
    assert.equal(changes, 1);
    assert.equal(engine.getSnapshot()?.phase, "ended");
  });
});

describe("the controls", () => {
  test("stop while loading pauses the element and leaves nothing", () => {
    engine.play("vapor");
    engine.stop();
    assert.equal(el().paused, true);
    assert.equal(engine.getSnapshot(), null);
  });

  test("replay plays the ended track from 0", () => {
    startPlaying("vapor");
    el().runOut();
    engine.replay();
    assert.equal(el().currentTime, 0);
    assert.equal(el().calls.at(-1), `play ${src("vapor")}`);
    assert.equal(engine.getSnapshot()?.phase, "loading");
  });

  test("replay after intent() moved the element puts the ended track back", () => {
    startPlaying("vapor");
    el().runOut();
    engine.intent("kaizen");
    engine.replay();
    assert.equal(el().src, src("vapor"));
    assert.equal(engine.getSnapshot()?.trackId, "vapor");
  });

  test("replay after a failure reloads the file", () => {
    engine.play("vapor");
    el().emit("error");
    engine.replay();
    assert.ok(el().calls.includes(`load ${src("vapor")}`));
    assert.equal(engine.getSnapshot()?.failed, false);
  });

  test("replay does nothing unless the snippet has ended", () => {
    startPlaying("vapor");
    const before = el().calls.length;
    engine.replay();
    assert.equal(el().calls.length, before);
  });

  test("close hides the bar and keeps the track", () => {
    startPlaying("vapor");
    el().runOut();
    engine.close();
    assert.equal(engine.getSnapshot()?.barOpen, false);
    assert.equal(engine.getSnapshot()?.trackId, "vapor");
  });
});

describe("the load timeout", () => {
  test("10 s in loading fails the snippet and pauses the element, so it can't start late", () => {
    engine.play("vapor");
    fireTimers();
    assert.equal(engine.getSnapshot()?.phase, "ended");
    assert.equal(engine.getSnapshot()?.failed, true);
    assert.equal(el().paused, true);
    el().emit("playing");
    assert.equal(engine.getSnapshot()?.phase, "ended");
  });

  test("is cleared once it plays, and restarted by a stall", () => {
    engine.play("vapor");
    el().emit("playing");
    assert.equal(timers.size, 0);
    el().emit("waiting");
    assert.equal(timers.size, 1);
    el().emit("playing");
    assert.equal(timers.size, 0);
  });

  test("restarts for a new track, so the old track's timer can't fail it", () => {
    engine.play("vapor");
    engine.play("kaizen");
    assert.equal(timers.size, 1);
  });

  test("is cleared by stop and by an error", () => {
    engine.play("vapor");
    engine.stop();
    assert.equal(timers.size, 0);
    engine.play("vapor");
    el().emit("error");
    assert.equal(timers.size, 0);
  });
});

describe("intent and warm", () => {
  test("intent() points the idle element at the track with preload auto", () => {
    engine.intent("kaizen");
    assert.equal(el().src, src("kaizen"));
    assert.equal(el().preload, "auto");
    assert.deepEqual(el().calls, []);
    assert.equal(engine.getSnapshot(), null);
  });

  test("intent() never changes the source while something loads or plays", () => {
    engine.play("vapor");
    engine.intent("kaizen");
    assert.equal(el().src, src("vapor"));
    el().emit("playing");
    engine.intent("kaizen");
    assert.equal(el().src, src("vapor"));
  });

  test("intent() works again once the snippet has ended", () => {
    startPlaying("vapor");
    el().runOut();
    engine.intent("kaizen");
    assert.equal(el().src, src("kaizen"));
  });

  test("intent() on the warmed track upgrades it to preload auto", () => {
    engine.warm("vapor");
    engine.intent("vapor");
    assert.equal(el().preload, "auto");
  });

  test("warm() fetches the first range only, before anything else", () => {
    engine.warm("vapor");
    assert.equal(el().src, src("vapor"));
    assert.equal(el().preload, "metadata");
    assert.equal(engine.getSnapshot(), null);
  });

  // Reno approved a warm-up of about 8 to 16 KB. preload="metadata" alone let
  // Brave read 99 to 318 kB, and a whole 634 kB snippet in one throttled run.
  test("warm() stops the download once the file's index has arrived", () => {
    engine.warm("vapor");
    el().emit("loadedmetadata");
    assert.equal(el().src, "");
    assert.deepEqual(el().calls, ["remove src", "load "]);
    assert.equal(engine.getSnapshot(), null);
  });

  test("a tap after the warm-up has stopped loads the file again", () => {
    engine.warm("vapor");
    el().emit("loadedmetadata");
    engine.play("vapor");
    assert.equal(el().src, src("vapor"));
    assert.equal(el().preload, "auto");
    assert.equal(el().calls.at(-1), `play ${src("vapor")}`);
  });

  test("a touch during the warm-up keeps the download going", () => {
    engine.warm("vapor");
    engine.intent("vapor");
    el().emit("loadedmetadata");
    assert.equal(el().src, src("vapor"));
    assert.ok(!el().calls.includes("remove src"));
  });

  test("a tap during the warm-up keeps the download going", () => {
    engine.warm("vapor");
    engine.play("vapor");
    el().emit("loadedmetadata");
    assert.equal(el().src, src("vapor"));
    assert.ok(!el().calls.includes("remove src"));
  });

  test("a later file's metadata never stops anything", () => {
    engine.intent("kaizen");
    el().emit("loadedmetadata");
    assert.equal(el().src, src("kaizen"));
  });

  test("warm() never moves an element intent() or a tap already pointed", () => {
    engine.intent("kaizen");
    engine.warm("vapor");
    assert.equal(el().src, src("kaizen"));
    assert.equal(el().preload, "auto");
  });

  test("an unknown id throws, naming it", () => {
    assert.throws(() => engine.intent("nope"), /"nope"/);
    assert.throws(() => engine.warm("nope"), /"nope"/);
  });
});

describe("subscribe and getSnapshot", () => {
  test("listeners run once per change, and not for events that change nothing", () => {
    engine.play("vapor");
    assert.equal(changes, 1);
    el().emit("timeupdate"); // still loading: no change
    assert.equal(changes, 1);
    el().emit("playing");
    assert.equal(changes, 2);
  });

  test("getSnapshot returns the same object until something changes", () => {
    startPlaying("vapor");
    const snapshot = engine.getSnapshot();
    el().emit("playing");
    assert.equal(engine.getSnapshot(), snapshot);
  });

  test("unsubscribe stops the calls", () => {
    let calls = 0;
    const off = engine.subscribe(() => calls++);
    engine.play("vapor");
    off();
    el().emit("playing");
    assert.equal(calls, 1);
  });
});
