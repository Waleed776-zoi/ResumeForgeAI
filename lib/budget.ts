/**
 * Time budgeting across the generation pipeline.
 *
 * The bug this exists to prevent: a single deadline shared by every model
 * call means whichever stage runs LAST gets whatever the earlier ones left
 * behind. When parsing and tailoring ran long, the integrity check inherited
 * under four seconds, refused to start, and the user got a resume stamped
 * "the automated fact-check did not run" — while the error itself read
 * "Tried 0 times", because nothing had been tried.
 *
 * Verification is the product's entire promise. It cannot be the stage that
 * pays for everyone else's overruns. So each stage gets its own deadline,
 * capped at what it should reasonably need and floored so it always has room
 * to make at least one attempt.
 */

export type Stage = "parsing" | "tailoring" | "verifying";

/** Most time a stage may consume when the budget is otherwise unconstrained. */
const MAX_PER_STAGE: Record<Stage, number> = {
  parsing: 16_000, // two calls, run concurrently
  tailoring: 26_000, // the long one: full resume in, full resume out
  verifying: 12_000,
};

/** Time held back for the stages that come *after* this one. */
const RESERVE_AFTER: Record<Stage, number> = {
  parsing: 20_000, // tailoring + verifying must still fit
  tailoring: 8_000, // verifying must still fit
  verifying: 0,
};

/**
 * A stage is always allowed at least this much, even if earlier stages
 * overran — a call that never starts produces no result AND no diagnosis,
 * which is strictly worse than one that starts and fails honestly.
 *
 * This floor deliberately IGNORES the overall budget. The overall figure is a
 * soft target chosen to sit well inside the function's hard `maxDuration`;
 * letting the last stage borrow a few seconds from that headroom is the whole
 * point, because the alternative is shipping an unverified resume. The
 * arithmetic is sized so a full overshoot still lands comfortably inside the
 * hard limit — see MODEL_BUDGET_MS in the generate route.
 */
const MIN_PER_STAGE = 6_000;

export function stageDeadline(
  overallDeadline: number,
  stage: Stage,
  now: number = Date.now()
): number {
  const cap = now + MAX_PER_STAGE[stage];
  const leavingRoomForLaterStages = overallDeadline - RESERVE_AFTER[stage];

  // Not clamped to overallDeadline: see the note on MIN_PER_STAGE. Clamping
  // here was the original defect — when the shared clock was nearly spent the
  // floor collapsed to "whatever's left", which is precisely the starvation
  // this module exists to prevent.
  const floor = now + MIN_PER_STAGE;

  return Math.max(Math.min(cap, leavingRoomForLaterStages), floor);
}

/** Exposed for tests and for the budget note in docs. */
export const BUDGET_SHAPE = { MAX_PER_STAGE, RESERVE_AFTER, MIN_PER_STAGE };
