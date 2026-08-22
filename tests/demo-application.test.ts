import { describe, it, expect } from "vitest";
import { atsReport } from "../lib/ats";
import { gapAnalysis } from "../lib/gap-analysis";
import { buildChangeLedger } from "../lib/change-ledger";
import {
  DEMO_ORIGINAL,
  DEMO_JOB,
  DEMO_TAILORED,
  DEMO_REWRITE,
} from "../lib/demo-application";

/**
 * The landing page shows a real audit of this fixture rather than a picture
 * of one, which means the fixture is now load-bearing marketing. These tests
 * are what stop it drifting into either of the two dishonest directions: a
 * demo that quietly fabricates, or a demo tuned until it scores perfectly.
 */

const gap = () => gapAnalysis(DEMO_ORIGINAL.skills, DEMO_JOB.required_skills);

const report = () =>
  atsReport({
    tailored: DEMO_TAILORED,
    job: DEMO_JOB,
    gap: gap(),
    contact: DEMO_ORIGINAL.contact,
    education: DEMO_ORIGINAL.education,
  });

describe("the landing page demo", () => {
  it("obeys the product's own rule: nothing is invented", () => {
    const ledger = buildChangeLedger({
      original: DEMO_ORIGINAL,
      tailored: DEMO_TAILORED,
      job: DEMO_JOB,
    });

    // If the marketing example itself fabricated a figure, every claim on the
    // page above it would be false.
    expect(ledger.stats.needsReview).toBe(0);
    expect(ledger.factsPreserved).toBe(true);
    expect(ledger.alteredFacts).toEqual([]);
  });

  it("never lists a skill the original resume didn't claim", () => {
    const had = new Set(DEMO_ORIGINAL.skills.map((s) => s.toLowerCase()));
    for (const skill of DEMO_TAILORED.skills) {
      expect(had.has(skill.toLowerCase())).toBe(true);
    }
  });

  it("scores well without scoring perfectly", () => {
    const { score, band } = report();

    // A demo resume at 100 reads as a sales mock-up; one in the fifties sells
    // nothing. The honest window is a good resume with a real weakness.
    expect(score).toBeGreaterThanOrEqual(80);
    expect(score).toBeLessThanOrEqual(95);
    expect(band).toBe("strong");
  });

  it("shows at least one check the candidate has actually failed", () => {
    const scored = report().checks.filter((c) => c.status !== "skipped");
    const weak = scored.filter((c) => c.earned / c.weight < 0.8);

    // The point of the visual is which bar is short. If every bar is full,
    // the section is decoration.
    expect(weak.length).toBeGreaterThan(0);
    expect(weak.map((c) => c.id)).toContain("keyword-coverage");
  });

  it("leaves nothing skipped, so the visual has no empty rows", () => {
    expect(report().checks.every((c) => c.status !== "skipped")).toBe(true);
    expect(report().available).toBe(100);
  });

  it("keeps the animated rewrite identical to the tailored bullet", () => {
    // The animation splits this sentence into marked segments. Reassembled,
    // it has to be the exact bullet the audit above just scored — otherwise
    // the page is demonstrating one resume and grading another.
    expect(DEMO_REWRITE.map((s) => s.text).join("")).toBe(
      DEMO_TAILORED.experience[0].bullets[0]
    );
  });

  it("marks only phrases that are really in the segmented sentence", () => {
    const marked = DEMO_REWRITE.filter((s) => s.mark);
    expect(marked.length).toBeGreaterThan(0);
    for (const segment of marked) {
      expect(segment.note).toBeTruthy();
      expect(DEMO_TAILORED.experience[0].bullets[0]).toContain(segment.text);
    }
  });

  it("gives the hero card a genuine gap to display", () => {
    const { matched, missing } = gap();
    expect(matched.length).toBeGreaterThan(0);
    expect(missing.length).toBeGreaterThan(0);
    expect(matched.length + missing.length).toBe(
      DEMO_JOB.required_skills.length
    );
  });
});
