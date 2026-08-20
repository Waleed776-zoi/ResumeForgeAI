import { describe, it, expect } from "vitest";
import { buildChangeLedger } from "../lib/change-ledger";
import type { ResumeJson, TailoredOutput, JobJson } from "../lib/types";

const original: ResumeJson = {
  name: "Muhammad Waleed Khan",
  contact: "waleed@example.com",
  summary: "AI researcher working on medical imaging.",
  skills: ["Python", "PyTorch", "Docker"],
  experience: [
    {
      title: "AI Engineer",
      company: "NUST",
      dates: "2023 – 2025",
      bullets: [
        "Worked on a medical imaging project. Built the backend and helped get it running in the hospital.",
        "Reduced inference latency to 1.2 s per image.",
        "Wrote internal documentation for the deployment process.",
      ],
    },
  ],
  education: ["MS CSE — NUST"],
  certifications: [],
  publications: [],
};

const job: JobJson = {
  role: "Machine Learning Engineer",
  company: "Acme",
  seniority: "Mid",
  required_skills: ["Python", "PyTorch", "TensorFlow"],
  responsibilities: ["Deploy deep learning systems to production"],
};

/** A faithful tailoring: reworded, nothing invented. */
const honest: TailoredOutput = {
  summary: "AI researcher deploying deep learning systems for medical imaging.",
  skills: ["Python", "PyTorch", "Docker"],
  experience: [
    {
      title: "AI Engineer",
      company: "NUST",
      dates: "2023 – 2025",
      bullets: [
        "Built and deployed a deep learning medical imaging system to production.",
        "Reduced inference latency to 1.2 s per image.",
      ],
    },
  ],
  cover_letter: "",
};

const build = (tailored: TailoredOutput) =>
  buildChangeLedger({ original, tailored, job });

describe("buildChangeLedger", () => {
  it("pairs a reworded bullet with the line it came from", () => {
    const entry = build(honest).entries.find(
      (e) => e.tailored?.startsWith("Built and deployed")
    );

    expect(entry?.kind).toBe("reworded");
    expect(entry?.original).toContain("Worked on a medical imaging project");
    expect(entry?.verdict).toBe("supported");
  });

  it("recognises an untouched line instead of calling it a change", () => {
    const entry = build(honest).entries.find((e) =>
      e.tailored?.includes("1.2 s per image")
    );
    expect(entry?.kind).toBe("unchanged");
  });

  it("records content that was dropped", () => {
    const removed = build(honest).entries.filter((e) => e.kind === "removed");
    expect(removed).toHaveLength(1);
    expect(removed[0].original).toContain("internal documentation");
    // A removal cannot fabricate anything, so it is never "needs review".
    expect(removed[0].verdict).toBe("supported");
  });

  it("credits borrowed job-posting language without flagging it", () => {
    const entry = build(honest).entries.find((e) =>
      e.tailored?.startsWith("Built and deployed")
    );
    // The posting says "Deploy", the bullet says "deployed" — the light stem
    // matches them, and the word kept for highlighting is the one that
    // actually appears in the text.
    expect(entry?.borrowed).toContain("deployed");
    expect(entry?.borrowed).toContain("learning");
    expect(entry?.source).toContain("posting");
    expect(entry?.verdict).toBe("supported");
  });

  it("FLAGS an invented figure", () => {
    // The single highest-risk fabrication: a metric that never existed.
    const ledger = build({
      ...honest,
      experience: [
        {
          ...honest.experience[0],
          bullets: ["Improved diagnostic accuracy by 94% across the hospital."],
        },
      ],
    });

    const flagged = ledger.entries.find((e) => e.verdict === "review");
    expect(flagged).toBeDefined();
    expect(flagged?.unsupported).toContain("94%");
    expect(ledger.stats.needsReview).toBeGreaterThan(0);
  });

  it("FLAGS a skill the resume never claimed", () => {
    const ledger = build({ ...honest, skills: [...honest.skills, "TensorFlow"] });

    const flagged = ledger.entries.find((e) => e.tailored === "TensorFlow");
    expect(flagged?.kind).toBe("added");
    expect(flagged?.verdict).toBe("review");
    expect(flagged?.unsupported).toContain("tensorflow");
    // A fabricated skill borrowed from the posting must never be described
    // as having come from the resume.
    expect(flagged?.source).toContain("Not traceable");
    expect(flagged?.source).not.toContain("Your resume,");
  });

  it("does not flag a skill that merely moved between sections", () => {
    // Docker is in the original skills list; surfacing it in a bullet is a
    // reorganisation, not an invention.
    const ledger = build({
      ...honest,
      experience: [
        {
          ...honest.experience[0],
          bullets: ["Containerised the imaging service with Docker."],
        },
      ],
    });
    expect(ledger.stats.needsReview).toBe(0);
  });

  it("catches altered employment facts", () => {
    const ledger = build({
      ...honest,
      experience: [{ ...honest.experience[0], dates: "2021 – 2025" }],
    });

    expect(ledger.factsPreserved).toBe(false);
    expect(ledger.alteredFacts[0]).toContain("2021 – 2025");
  });

  it("treats a fabricated employer as an altered fact", () => {
    const ledger = build({
      ...honest,
      experience: [
        { ...honest.experience[0], company: "Google", bullets: ["Did work."] },
      ],
    });
    expect(ledger.factsPreserved).toBe(false);
    expect(ledger.alteredFacts.join(" ")).toContain("Google");
  });

  it("does not treat a date in prose as a fabricated metric", () => {
    const ledger = build({
      ...honest,
      experience: [
        {
          ...honest.experience[0],
          bullets: ["Worked on the medical imaging project through 2024."],
        },
      ],
    });
    expect(ledger.stats.needsReview).toBe(0);
  });

  it("keeps the stats consistent with the entries", () => {
    const ledger = build(honest);
    const { stats, entries } = ledger;

    expect(stats.total).toBe(entries.length);
    expect(stats.reworded + stats.added + stats.removed + stats.unchanged).toBe(
      entries.length
    );
    expect(stats.needsReview).toBe(
      entries.filter((e) => e.verdict === "review").length
    );
  });

  it("survives an empty tailored output without throwing", () => {
    const ledger = build({
      summary: "",
      skills: [],
      experience: [],
      cover_letter: "",
    });
    expect(ledger.factsPreserved).toBe(true);
    expect(ledger.stats.needsReview).toBe(0);
  });
});
