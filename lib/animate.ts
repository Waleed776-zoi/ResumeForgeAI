/**
 * Timeline maths for JS-driven animation.
 *
 * Split out from the components because it is the part that can be wrong in a
 * way nobody notices: an off-by-one in a stagger just looks like a slightly
 * odd rhythm, and a progress function that overshoots hands a counter a
 * number the audit never produced. Pure functions, so they can be checked.
 */

export const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);

/**
 * Decelerating ease. Values arrive fast and settle slowly, which is what
 * makes a counter read as "measuring" rather than "spinning".
 */
export const easeOutCubic = (t: number) => 1 - (1 - clamp01(t)) ** 3;

/** Where a segment starting at `start` and lasting `duration` is, at `elapsed`. */
export function progressAt(elapsed: number, start: number, duration: number) {
  if (duration <= 0) return elapsed >= start ? 1 : 0;
  return clamp01((elapsed - start) / duration);
}

/**
 * The eased value of a count-up at a given progress.
 *
 * Rounded, so what a reader sees is always a whole number the audit could
 * have produced — and exactly the target once progress reaches 1, never
 * target-minus-one from a floating point remainder.
 */
export function countTo(target: number, progress: number) {
  return Math.round(target * easeOutCubic(progress));
}

/** The unrounded version, for bar widths — rounding those causes visible steps. */
export function fractionTo(target: number, progress: number) {
  return target * easeOutCubic(progress);
}
