import { describe, it, expect } from "vitest";
import { atsReport } from "../lib/ats";
import { gapAnalysis } from "../lib/gap-analysis";
import { buildChangeLedger } from "../lib/change-ledger";
import {
  DEMO_APPLICATIONS,
  pickDemoApplication,
  type DemoApplication,
} from "../lib/demo-application";

/**
 * The landing page shows a real audit of these fixtures rather than a picture
 * of one, which makes them load-bearing marketing. Every guarantee below runs
 * against EVERY fixture, so adding a sixth domain is only possible if it
 * survives the same bar: nothing fabricated, a genuine gap to show, a score
 * in the eighties, and an animated sentence identical to the bullet the audit
 * actually scored.
 */

const gapFor = (demo: DemoApplication) =>
  gapAnalysis(demo.original.skills, demo.job.required_skills);

const reportFor = (demo: DemoApplication) =>
  atsReport({
    tailored: demo.tailored,
    job: demo.job,
    gap: gapFor(demo),
    contact: demo.original.contact,
    education: demo.original.education,
  });

describe("the landing page demos", () => {
  it("offers more than one domain", () => {
    // A single hard-coded resume implies the product only understands one
    // kind of career. The rotation is the argument against that.
    expect(DEMO_APPLICATIONS.length).toBeGreaterThanOrEqual(4);
    expect(new Set(DEMO_APPLICATIONS.map((d) => d.id)).size).toBe(
      DEMO_APPLICATIONS.length
    );
    expect(new Set(DEMO_APPLICATIONS.map((d) => d.field)).size).toBe(
      DEMO_APPLICATIONS.length
    );
  });

  it("never returns anything but a real fixture, whatever the index", () => {
    // A bad index must not be able to break the landing page.
    for (const index of [0, 4, 9, 500, -1, -7]) {
      expect(DEMO_APPLICATIONS).toContain(pickDemoApplication(index));
    }
    for (let i = 0; i < 50; i += 1) {
      expect(DEMO_APPLICATIONS).toContain(pickDemoApplication());
    }
  });

  it("eventually shows every domain", () => {
    const seen = new Set(
      Array.from({ length: 400 }, () => pickDemoApplication().id)
    );
    expect(seen.size).toBe(DEMO_APPLICATIONS.length);
  });
});

describe.each(DEMO_APPLICATIONS.map((d) => [d.id, d] as const))(
  "demo: %s",
  (_id, demo) => {
    it("obeys the product's own rule: nothing is invented", () => {
      const ledger = buildChangeLedger({
        original: demo.original,
        tailored: demo.tailored,
        job: demo.job,
      });

      // If the marketing example itself fabricated a figure, every claim on
      // the page above it would be false.
      expect(ledger.stats.needsReview).toBe(0);
      expect(ledger.factsPreserved).toBe(true);
      expect(ledger.alteredFacts).toEqual([]);
    });

    it("never lists a skill the original resume didn't claim", () => {
      const had = new Set(
        demo.original.skills.map((s) => s.toLowerCase())
      );
      for (const skill of demo.tailored.skills) {
        expect(had.has(skill.toLowerCase())).toBe(true);
      }
    });

    it("scores well without scoring perfectly", () => {
      const { score, band } = reportFor(demo);

      // A demo resume at 100 reads as a sales mock-up; one in the fifties
      // sells nothing. The honest window is a good resume with a real
      // weakness.
      expect(score).toBeGreaterThanOrEqual(80);
      expect(score).toBeLessThanOrEqual(95);
      expect(band).toBe("strong");
    });

    it("shows at least one check the candidate has actually failed", () => {
      const scored = reportFor(demo).checks.filter(
        (c) => c.status !== "skipped"
      );
      const weak = scored.filter((c) => c.earned / c.weight < 0.8);

      // The point of the visual is which bar is short. If every bar is full,
      // the section is decoration.
      expect(weak.length).toBeGreaterThan(0);
      expect(weak.map((c) => c.id)).toContain("keyword-coverage");
    });

    it("leaves nothing skipped, so the visual has no empty rows", () => {
      const report = reportFor(demo);
      expect(report.checks.every((c) => c.status !== "skipped")).toBe(true);
      expect(report.available).toBe(100);
    });

    it("gives the hero card a genuine gap to display", () => {
      const { matched, missing } = gapFor(demo);
      expect(matched.length).toBeGreaterThan(0);
      // Plural, so the card's "N are not" copy stays grammatical.
      expect(missing.length).toBeGreaterThanOrEqual(2);
      expect(matched.length + missing.length).toBe(
        demo.job.required_skills.length
      );
    });

    it("keeps the animated rewrite identical to the tailored bullet", () => {
      // The animation splits this sentence into marked segments. Reassembled,
      // it has to be the exact bullet the audit just scored — otherwise the
      // page is demonstrating one resume and grading another.
      expect(demo.rewrite.map((s) => s.text).join("")).toBe(
        demo.tailored.experience[0].bullets[0]
      );
    });

    it("marks only phrases that are really in the segmented sentence", () => {
      const marked = demo.rewrite.filter((s) => s.mark);
      const bullet = demo.tailored.experience[0].bullets[0];

      expect(marked.length).toBeGreaterThanOrEqual(2);
      for (const segment of marked) {
        expect(segment.note).toBeTruthy();
        expect(bullet).toContain(segment.text);
      }
    });

    it("carries exactly one of the candidate's own figures through", () => {
      const kept = demo.rewrite.filter((s) => s.mark === "kept");
      expect(kept).toHaveLength(1);

      // "carried over unchanged" is a claim, and it has to be true: every
      // number in that phrase must already appear in the original resume.
      const originalText = [
        demo.original.summary,
        ...demo.original.skills,
        ...demo.original.experience.flatMap((e) => [
          e.title,
          e.company,
          e.dates,
          ...e.bullets,
        ]),
      ].join(" ");

      const figures = kept[0].text.match(/\d+(?:\.\d+)?/g) ?? [];
      expect(figures.length).toBeGreaterThan(0);
      for (const figure of figures) {
        expect(originalText).toContain(figure);
      }
    });

    it("borrows its posting phrases from the posting", () => {
      const postingText = [
        demo.job.role,
        ...demo.job.required_skills,
        ...demo.job.responsibilities,
      ]
        .join(" ")
        .toLowerCase();

      // Each phrase the page credits to the posting has to share real
      // vocabulary with it — otherwise the provenance chain is decoration.
      for (const segment of demo.rewrite.filter(
        (s) => s.mark === "posting"
      )) {
        const words = segment.text
          .toLowerCase()
          .split(/\s+/)
          .filter((w) => w.length > 3);
        expect(words.some((w) => postingText.includes(w.slice(0, 5)))).toBe(
          true
        );
      }
    });

    it("has contact details a parser can actually read", () => {
      expect(demo.original.contact).toMatch(/[^\s@]+@[^\s@]+\.[^\s@]+/);
      expect(demo.original.contact).toMatch(/\+?\d[\d\s\-().]{7,}\d/);
      expect(demo.original.education.length).toBeGreaterThan(0);
    });
  }
);
