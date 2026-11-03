// Floors rather than rounds, so a readout never shows a second that hasn't
// played yet. An <audio> element reports NaN or Infinity before its metadata
// loads, so anything that isn't a real position reads as blank tape.
export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "--:--";
  const whole = Math.floor(seconds);
  const minutes = String(Math.floor(whole / 60)).padStart(2, "0");
  const secs = String(whole % 60).padStart(2, "0");
  return `${minutes}:${secs}`;
}
