import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement } from "react";
import { renderToString } from "react-dom/server";

// Node has no window, document or Audio, as during next build's prerender.
test("there's no browser here, so the checks below mean something", () => {
  assert.equal(typeof globalThis.window, "undefined");
  assert.equal(typeof (globalThis as { Audio?: unknown }).Audio, "undefined");
});

test("importing the public index touches nothing in the browser", async () => {
  const audio = await import("../src/audio/index.ts");
  assert.equal(typeof audio.createAudioEngine, "function");
  assert.equal(typeof audio.useAudioEngine, "function");
  assert.equal(typeof audio.tracksFrom, "function");
});

test("an engine made with the browser defaults makes no element until it's used", async () => {
  const { createAudioEngine } = await import("../src/audio/index.ts");
  const engine = createAudioEngine([]);
  const off = engine.subscribe(() => {});
  assert.equal(engine.getSnapshot(), null);
  engine.stop();
  engine.close();
  engine.replay();
  off();
});

test("the hook renders null on the server", async () => {
  const { createAudioEngine, useAudioEngine } = await import("../src/audio/index.ts");
  const engine = createAudioEngine([]);
  let seen: unknown = "not rendered";
  const Probe = () => {
    seen = useAudioEngine(engine);
    return null;
  };
  assert.equal(renderToString(createElement(Probe)), "");
  assert.equal(seen, null);
});
