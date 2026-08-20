import { describe, it, expect } from "vitest";
import { stageDeadline, BUDGET_SHAPE } from "../lib/budget";
import { MIN_CALL_MS } from "../lib/gemini-response";

const BUDGET = 46_000;
const START = 1_000_000; // fixed clock so these assertions are deterministic
const OVERALL = START + BUDGET;

const secondsFor = (stage: Parameters<typeof stageDeadline>[1], now: number) =>
  (stageDeadline(OVERALL, stage, now) - now) / 1000;

describe("stageDeadline", () => {
  it("caps each stage at what it should reasonably need", () => {
    expect(secondsFor("parsing", START)).toBe(16);
    expect(secondsFor("tailoring", START)).toBe(26);
    // ...but only while there is room; the reserve wins once time is short.
    expect(secondsFor("verifying", START)).toBe(12);
  });

  it("never hands a stage more than the overall budget when time is healthy", () => {
    for (const stage of ["parsing", "tailoring", "verifying"] as const) {
      expect(stageDeadline(OVERALL, stage, START)).toBeLessThanOrEqual(OVERALL);
    }
  });

  it("holds time back so later stages can still run", () => {
    // Parsing must not be allowed to consume the whole budget just because
    // it started first.
    const late = OVERALL - 30_000;
    expect(stageDeadline(OVERALL, "parsing", late)).toBeLessThanOrEqual(
      OVERALL - BUDGET_SHAPE.RESERVE_AFTER.parsing
    );
  });

  it("REGRESSION: the integrity check always gets time to try", () => {
    // The bug: one deadline shared by every call meant verifying inherited
    // whatever was left. When parsing and tailoring ran long that was under
    // MIN_CALL_MS, so it refused to start and reported "Tried 0 times" —
    // surfacing to the user as "the automated fact-check did not run".
    const almostSpent = OVERALL - 2_000; // only 2s left on the shared clock

    const shared = OVERALL - almostSpent; // what the old code would have given
    expect(shared).toBeLessThan(MIN_CALL_MS); // ...which is why it gave up

    const allocated = stageDeadline(OVERALL, "verifying", almostSpent);
    expect(allocated - almostSpent).toBeGreaterThanOrEqual(MIN_CALL_MS);
    expect(allocated - almostSpent).toBe(BUDGET_SHAPE.MIN_PER_STAGE);
  });

  it("gives a late-running tailoring step room rather than zero", () => {
    const late = OVERALL - 3_000;
    expect(stageDeadline(OVERALL, "tailoring", late) - late).toBe(
      BUDGET_SHAPE.MIN_PER_STAGE
    );
  });

  it("keeps the floor above the minimum a call needs to be worth starting", () => {
    // If the floor ever dropped below MIN_CALL_MS the allocator would hand
    // out deadlines that generateJson immediately refuses.
    expect(BUDGET_SHAPE.MIN_PER_STAGE).toBeGreaterThan(MIN_CALL_MS);
  });

  it("fits an end-to-end worst case inside the budget", () => {
    let now = START;
    for (const stage of ["parsing", "tailoring", "verifying"] as const) {
      now = stageDeadline(OVERALL, stage, now); // each stage runs to its limit
    }
    expect(now).toBeLessThanOrEqual(OVERALL);
  });
});
