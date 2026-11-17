import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { next } from "../src/audio/state.ts";
import type { EngineEvent, Phase, Playback } from "../src/audio/state.ts";

const at = (phase: Phase, extra: Partial<NonNullable<Playback>> = {}): NonNullable<Playback> => ({
  trackId: "ukg-333",
  phase,
  elapsed: phase === "ended" ? 30 : 12,
  duration: 30,
  barOpen: true,
  failed: false,
  ...extra,
});

const play = (trackId = "cant-you-see"): EngineEvent => ({ type: "play", trackId, duration: 30 });

// Every state the engine can be in, for "doesn't apply here" checks.
const STATES: [string, Playback][] = [
  ["nothing played", null],
  ["loading", at("loading", { elapsed: 0 })],
  ["playing", at("playing")],
  ["ended, bar open", at("ended")],
  ["ended, bar closed", at("ended", { barOpen: false })],
  ["ended, failed", at("ended", { failed: true })],
];

describe("play, a tap", () => {
  for (const [name, state] of STATES) {
    test(`from ${name}, loads the tapped track from 0 with the bar open`, () => {
      assert.deepEqual(next(state, play()), {
        trackId: "cant-you-see",
        phase: "loading",
        elapsed: 0,
        duration: 30,
        barOpen: true,
        failed: false,
      });
    });
  }

  test("takes its duration from the event, which comes from the catalogue", () => {
    assert.equal(next(null, { type: "play", trackId: "x", duration: 29.98 })?.duration, 29.98);
  });
});

describe("the element's own events", () => {
  test("playing: loading becomes playing, keeping elapsed", () => {
    assert.deepEqual(next(at("loading", { elapsed: 7 }), { type: "playing" }), at("playing", { elapsed: 7 }));
  });

  test("waiting: playing goes back to loading while it buffers", () => {
    assert.deepEqual(next(at("playing"), { type: "waiting" }), at("loading"));
  });

  test("timeupdate: playing moves elapsed, held between 0 and the duration", () => {
    assert.equal(next(at("playing"), { type: "timeupdate", time: 12.25 })?.elapsed, 12.25);
    assert.equal(next(at("playing"), { type: "timeupdate", time: 30.4 })?.elapsed, 30);
    assert.equal(next(at("playing"), { type: "timeupdate", time: -1 })?.elapsed, 0);
    assert.equal(next(at("playing"), { type: "timeupdate", time: Number.NaN })?.elapsed, 0);
  });

  test("timeupdate at the same time changes nothing", () => {
    const state = at("playing");
    assert.equal(next(state, { type: "timeupdate", time: 12 }), state);
  });

  test("ended: playing ends, with elapsed at the duration and the bar open", () => {
    assert.deepEqual(next(at("playing"), { type: "ended" }), at("ended"));
  });

  test("interrupted, a pause the engine didn't ask for, ends it as a stop", () => {
    assert.deepEqual(next(at("playing"), { type: "interrupted" }), at("ended", { elapsed: 12 }));
  });

  for (const [name, state] of [STATES[1], STATES[2]]) {
    test(`error from ${name} ends it, failed, with the bar open`, () => {
      const ended = next(state, { type: "error" });
      assert.equal(ended?.phase, "ended");
      assert.equal(ended?.failed, true);
      assert.equal(ended?.barOpen, true);
      assert.equal(ended?.elapsed, state?.elapsed);
    });
  }

  test("timeout: 10 s in loading ends it, failed", () => {
    assert.deepEqual(next(at("loading", { elapsed: 0 }), { type: "timeout" }), at("ended", { elapsed: 0, failed: true }));
  });
});

describe("the controls", () => {
  test("stop while loading leaves nothing behind, since nothing sounded", () => {
    assert.equal(next(at("loading"), { type: "stop" }), null);
  });

  test("stop while playing ends it with the bar open, as a snippet that ran out", () => {
    assert.deepEqual(next(at("playing"), { type: "stop" }), at("ended", { elapsed: 12 }));
  });

  test("replay from ended loads the same track from 0, bar open, not failed", () => {
    for (const state of [at("ended"), at("ended", { barOpen: false }), at("ended", { failed: true })]) {
      assert.deepEqual(next(state, { type: "replay" }), at("loading", { elapsed: 0 }));
    }
  });

  test("close from ended keeps the track, so its row stays played, and closes the bar", () => {
    assert.deepEqual(next(at("ended"), { type: "close" }), at("ended", { barOpen: false }));
  });
});

describe("an event that doesn't apply leaves the state as it is, the same object", () => {
  const applies: Record<EngineEvent["type"], string[]> = {
    play: STATES.map(([name]) => name),
    playing: ["loading"],
    waiting: ["playing"],
    timeupdate: ["playing"],
    ended: ["playing"],
    interrupted: ["playing"],
    error: ["loading", "playing"],
    timeout: ["loading"],
    stop: ["loading", "playing"],
    replay: ["ended, bar open", "ended, bar closed", "ended, failed"],
    close: ["ended, bar open", "ended, failed"],
  };
  const events: EngineEvent[] = [
    { type: "playing" },
    { type: "waiting" },
    { type: "timeupdate", time: 5 },
    { type: "ended" },
    { type: "interrupted" },
    { type: "error" },
    { type: "timeout" },
    { type: "stop" },
    { type: "replay" },
    { type: "close" },
  ];
  for (const event of events) {
    const skipped = STATES.filter(([name]) => !applies[event.type].includes(name));
    test(`${event.type} in ${skipped.map(([name]) => name).join(", ")}`, () => {
      for (const [, state] of skipped) assert.equal(next(state, event), state);
    });
  }

  test("close on a bar that's already closed", () => {
    const state = at("ended", { barOpen: false });
    assert.equal(next(state, { type: "close" }), state);
  });
});
