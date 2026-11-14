import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { TARGET_LUFS, TRUE_PEAK_CEILING, applyGain, integratedLoudness, kWeighting, matchLoudness, truePeakDbtp } from "../scripts/media/loudness.ts";
import { peakDbfs } from "../scripts/media/fade.ts";
import type { Audio } from "../scripts/media/wav.ts";

// The signals EBU Tech 3341 describes: 1 kHz sines at a level in dBFS
// (peak amplitude), joined end to end, the same on every channel.
function sines(sampleRate: number, parts: { seconds: number; dbfs: number; hz?: number; phase?: number }[], channelCount = 2): Audio {
  const frames = parts.reduce((n, p) => n + Math.round(p.seconds * sampleRate), 0);
  const data = new Float32Array(frames);
  let i = 0;
  for (const { seconds, dbfs, hz = 1000, phase = 0 } of parts) {
    const amplitude = dbfs === -Infinity ? 0 : 10 ** (dbfs / 20);
    const end = i + Math.round(seconds * sampleRate);
    for (let n = 0; i < end; i++, n++) data[i] = amplitude * Math.sin((2 * Math.PI * hz * n) / sampleRate + phase);
  }
  return { sampleRate, channels: Array.from({ length: channelCount }, () => data.slice()) };
}

const near = (actual: number, expected: number, tolerance: number, what: string) =>
  assert.ok(Math.abs(actual - expected) <= tolerance, `${what}: ${actual.toFixed(3)}, expected ${expected} ± ${tolerance}`);

describe("K-weighting", () => {
  test("matches BS.1770-4's published coefficients at 48 kHz", () => {
    const [shelf, highPass] = kWeighting(48_000);
    const published = [
      { b: [1.53512485958697, -2.69169618940638, 1.19839281085285], a: [-1.69065929318241, 0.73248077421585] },
      { b: [1, -2, 1], a: [-1.99004745483398, 0.99007225036621] },
    ];
    [shelf, highPass].forEach((stage, s) => {
      stage.b.forEach((value, i) => near(value, published[s].b[i], 1e-8, `stage ${s + 1} b${i}`));
      stage.a.forEach((value, i) => near(value, published[s].a[i], 1e-8, `stage ${s + 1} a${i + 1}`));
    });
  });
});

describe("integrated loudness", () => {
  for (const rate of [44_100, 48_000]) {
    test(`reads EBU 3341's steady sines at ${rate / 1000} kHz`, () => {
      near(integratedLoudness(sines(rate, [{ seconds: 20, dbfs: -23 }])), -23, 0.1, "−23 dBFS");
      near(integratedLoudness(sines(rate, [{ seconds: 20, dbfs: -33 }])), -33, 0.1, "−33 dBFS");
    });

    test(`gates out the quiet parts at ${rate / 1000} kHz`, () => {
      // Relative gate: averaged over every block, this is about −24.2 LUFS,
      // so the gate sits near −34.2 and the −36 dBFS parts fall under it.
      // Without the gate it would read −24.2.
      const gated = sines(rate, [
        { seconds: 10, dbfs: -36 },
        { seconds: 60, dbfs: -23 },
        { seconds: 10, dbfs: -36 },
      ]);
      near(integratedLoudness(gated), -23, 0.1, "10 s −36, 60 s −23, 10 s −36");
      // EBU 3341's case 4 adds 10 s at −72 dBFS at each end, under both gates.
      const both = sines(rate, [
        { seconds: 10, dbfs: -72 },
        { seconds: 10, dbfs: -36 },
        { seconds: 60, dbfs: -23 },
        { seconds: 10, dbfs: -36 },
        { seconds: 10, dbfs: -72 },
      ]);
      near(integratedLoudness(both), -23, 0.1, "−72, −36, −23, −36, −72");
      // Absolute gate: silence never counts.
      near(integratedLoudness(sines(rate, [{ seconds: 10, dbfs: -23 }, { seconds: 10, dbfs: -Infinity }])), -23, 0.1, "−23 then silence");
    });
  }

  test("counts a mono master as played through both speakers", () => {
    near(integratedLoudness(sines(48_000, [{ seconds: 20, dbfs: -23 }], 1)), -23, 0.1, "mono −23 dBFS");
  });

  test("is −Infinity for silence, or a file under one 400 ms block", () => {
    assert.equal(integratedLoudness(sines(48_000, [{ seconds: 5, dbfs: -Infinity }])), -Infinity);
    assert.equal(integratedLoudness(sines(48_000, [{ seconds: 0.3, dbfs: -6 }])), -Infinity);
  });
});

describe("true peak", () => {
  test("finds the peak between samples that the sample peak misses", () => {
    // A full-scale sine at a quarter of the sample rate, offset 45°: every
    // sample lands at ±0.707, but the wave between them reaches 1.
    const quarter = sines(48_000, [{ seconds: 1, dbfs: 0, hz: 12_000, phase: Math.PI / 4 }]);
    near(peakDbfs(quarter), -3.01, 0.05, "sample peak");
    near(truePeakDbtp(quarter), 0, 0.5, "true peak");
  });

  test("agrees with the sample peak on a low sine", () => {
    near(truePeakDbtp(sines(44_100, [{ seconds: 1, dbfs: -6 }])), -6, 0.1, "−6 dBFS at 1 kHz");
  });

  test("is −Infinity for silence", () => {
    assert.equal(truePeakDbtp(sines(48_000, [{ seconds: 1, dbfs: -Infinity }])), -Infinity);
  });
});

describe("the match", () => {
  test("aims at −14 LUFS with a −1 dBTP ceiling", () => {
    assert.equal(TARGET_LUFS, -14);
    assert.equal(TRUE_PEAK_CEILING, -1);
  });

  test("turns a loud cut down to −14", () => {
    const loud = sines(48_000, [{ seconds: 30, dbfs: -6 }]);
    const match = matchLoudness(loud);
    near(match.loudness, -6, 0.1, "measured");
    near(match.gain, -8, 0.1, "gain");
    assert.equal(match.shortfall, 0);
    near(integratedLoudness(applyGain(loud, match.gain)), -14, 0.1, "after");
  });

  test("raises a quiet cut to −14 when its peaks allow it", () => {
    const quiet = sines(44_100, [{ seconds: 30, dbfs: -20 }]);
    const match = matchLoudness(quiet);
    near(match.gain, 6, 0.1, "gain");
    assert.equal(match.shortfall, 0);
    near(integratedLoudness(applyGain(quiet, match.gain)), -14, 0.1, "after");
  });

  test("raises a quiet cut only as far as −1 dBTP, and reports the shortfall", () => {
    // Quiet overall, with one 10 ms burst near full scale.
    const peaky = sines(48_000, [
      { seconds: 15, dbfs: -30 },
      { seconds: 0.01, dbfs: -3 },
      { seconds: 15, dbfs: -30 },
    ]);
    const match = matchLoudness(peaky);
    near(match.gain, TRUE_PEAK_CEILING - match.truePeak, 1e-9, "gain stops at the ceiling");
    near(match.shortfall, TARGET_LUFS - match.loudness - match.gain, 1e-9, "shortfall");
    assert.ok(match.shortfall > 10, `shortfall ${match.shortfall}`);
    assert.ok(truePeakDbtp(applyGain(peaky, match.gain)) <= TRUE_PEAK_CEILING + 0.01);
  });

  test("leaves silence alone and says so", () => {
    const match = matchLoudness(sines(48_000, [{ seconds: 30, dbfs: -Infinity }]));
    assert.equal(match.gain, 0);
    assert.equal(match.silent, true);
  });

  test("applies one gain to every sample, as a copy", () => {
    const audio: Audio = { sampleRate: 48_000, channels: [Float32Array.of(0.5, -0.25), Float32Array.of(0.1, 0)] };
    const louder = applyGain(audio, 20 * Math.log10(2));
    near(louder.channels[0][0], 1, 1e-6, "left");
    near(louder.channels[0][1], -0.5, 1e-6, "left");
    near(louder.channels[1][0], 0.2, 1e-6, "right");
    assert.equal(audio.channels[0][0], 0.5);
  });
});
