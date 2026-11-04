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

// A snippet's length as the rows show it, "0:30": minutes unpadded, as the
// boards draw the time column beside an idle row. The readout and a running
// row count with formatTime instead.
export function formatLength(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "-:--";
  const whole = Math.floor(seconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}
