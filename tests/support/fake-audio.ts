import type { MediaElementLike } from "../../src/audio/engine.ts";

// The parts of HTMLAudioElement the engine uses. pause() fires "pause" at
// once when it was playing; a real element queues it, which the engine
// mustn't depend on either way.
export class FakeAudio extends EventTarget implements MediaElementLike {
  src = "";
  preload = "";
  currentTime = 0;
  paused = true;
  ended = false;
  calls: string[] = [];
  playResult: Promise<void> = Promise.resolve();

  play() {
    this.calls.push(`play ${this.src}`);
    this.paused = false;
    this.ended = false;
    return this.playResult;
  }
  pause() {
    this.calls.push("pause");
    if (this.paused) return;
    this.paused = true;
    this.emit("pause");
  }
  removeAttribute(name: string) {
    this.calls.push(`remove ${name}`);
    if (name === "src") this.src = "";
  }
  load() {
    this.calls.push(`load ${this.src}`);
  }
  emit(type: string) {
    this.dispatchEvent(new Event(type));
  }
  // What a real element does at the end: a last timeupdate just short of the
  // end, then pause, then ended.
  runOut() {
    this.currentTime = 29.95;
    this.emit("timeupdate");
    this.paused = true;
    this.ended = true;
    this.emit("pause");
    this.emit("ended");
  }
}
