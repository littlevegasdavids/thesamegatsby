import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { formatLength, formatTime } from "../src/design-system/format.ts";

describe("formatTime", () => {
  test("shows zero as 00:00", () => {
    assert.equal(formatTime(0), "00:00");
  });

  test("drops the fraction of a second rather than rounding up", () => {
    assert.equal(formatTime(12.4), "00:12");
    assert.equal(formatTime(29.9), "00:29");
  });

  test("shows a full snippet as 00:30", () => {
    assert.equal(formatTime(30), "00:30");
  });

  test("carries seconds into minutes", () => {
    assert.equal(formatTime(75), "01:15");
  });

  test("shows --:-- for NaN, negative or infinite input", () => {
    assert.equal(formatTime(Number.NaN), "--:--");
    assert.equal(formatTime(-1), "--:--");
    assert.equal(formatTime(Number.POSITIVE_INFINITY), "--:--");
  });
});

describe("formatLength", () => {
  test("shows a snippet's length as m:ss, as the rows draw it", () => {
    assert.equal(formatLength(30), "0:30");
    assert.equal(formatLength(0), "0:00");
    assert.equal(formatLength(75.9), "1:15");
  });

  test("shows -:-- for NaN, negative or infinite input", () => {
    assert.equal(formatLength(Number.NaN), "-:--");
    assert.equal(formatLength(-1), "-:--");
    assert.equal(formatLength(Number.POSITIVE_INFINITY), "-:--");
  });
});
