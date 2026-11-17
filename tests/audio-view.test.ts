import assert from "node:assert/strict";
import { describe, test } from "node:test";
import type { Playback } from "../src/audio/state.ts";
import { barState, rowState } from "../src/audio/view.ts";

const at = (phase: "loading" | "playing" | "ended", barOpen = true): Playback => ({
  trackId: "ukg-333",
  phase,
  elapsed: 3,
  duration: 30,
  barOpen,
  failed: false,
});

// SPEC-audio-engine.md's mapping table, row by row.
describe("the engine's state as the components' props", () => {
  const rows: [string, Playback, string, string, string][] = [
    ["nothing played", null, "idle", "idle", "hidden"],
    ["loading", at("loading"), "loading", "idle", "loading"],
    ["playing", at("playing"), "playing", "idle", "playing"],
    ["ended, bar open", at("ended"), "played", "idle", "ended"],
    ["ended, bar closed", at("ended", false), "played", "idle", "hidden"],
  ];
  for (const [name, state, own, other, bar] of rows) {
    test(name, () => {
      assert.equal(rowState(state, "ukg-333"), own);
      assert.equal(rowState(state, "cant-you-see"), other);
      assert.equal(barState(state), bar);
    });
  }

  test("a failed snippet shows the ended bar, so the stream buttons stay up", () => {
    const failed: Playback = { ...at("ended")!, failed: true };
    assert.equal(barState(failed), "ended");
    assert.equal(rowState(failed, "ukg-333"), "played");
  });
});
