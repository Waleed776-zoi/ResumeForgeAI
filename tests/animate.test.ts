import { describe, it, expect } from "vitest";
import {
  clamp01,
  easeOutCubic,
  progressAt,
  countTo,
  fractionTo,
} from "../lib/animate";

describe("timeline maths", () => {
  it("never leaves a segment outside 0..1", () => {
    expect(progressAt(0, 500, 600)).toBe(0);
    expect(progressAt(499, 500, 600)).toBe(0);
    expect(progressAt(800, 500, 600)).toBeCloseTo(0.5, 5);
    expect(progressAt(1100, 500, 600)).toBe(1);
    // Well past the end — a counter must not run past its target.
    expect(progressAt(99_999, 500, 600)).toBe(1);
    expect(clamp01(-3)).toBe(0);
    expect(clamp01(4)).toBe(1);
  });

  it("treats a zero-length segment as a switch, not a division", () => {
    expect(progressAt(100, 200, 0)).toBe(0);
    expect(progressAt(200, 200, 0)).toBe(1);
  });

  it("decelerates rather than running linearly", () => {
    // Half the time should have covered well over half the distance,
    // otherwise the count reads as spinning instead of settling.
    expect(easeOutCubic(0.5)).toBeGreaterThan(0.8);
    expect(easeOutCubic(0)).toBe(0);
    expect(easeOutCubic(1)).toBe(1);
  });

  it("lands exactly on the audit's own number", () => {
    // The one failure that would matter: a resume scored 86 finishing at 85
    // because of a floating point remainder.
    for (const target of [0, 60, 83, 86, 100]) {
      expect(countTo(target, 1)).toBe(target);
      expect(countTo(target, 0)).toBe(0);
    }
  });

  it("never shows a number above the target on the way up", () => {
    for (let p = 0; p <= 1.0001; p += 0.01) {
      expect(countTo(86, p)).toBeLessThanOrEqual(86);
      expect(fractionTo(86, p)).toBeLessThanOrEqual(86);
    }
  });

  it("keeps bar widths unrounded so they do not step", () => {
    const a = fractionTo(100, 0.331);
    const b = fractionTo(100, 0.332);
    expect(a).not.toBe(b);
  });
});
