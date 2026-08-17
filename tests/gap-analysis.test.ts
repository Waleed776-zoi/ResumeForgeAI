import { describe, it, expect } from "vitest";
import {
  gapAnalysis,
  normalizeSkill,
  categorizeSkill,
} from "../lib/gap-analysis";

describe("normalizeSkill", () => {
  it("lowercases and trims", () => {
    expect(normalizeSkill("  Python  ")).toBe("python");
  });

  it("resolves known aliases", () => {
    expect(normalizeSkill("JS")).toBe("javascript");
    expect(normalizeSkill("ReactJS")).toBe("react");
    expect(normalizeSkill("Node.js")).toBe("nodejs");
  });

  it("preserves meaningful punctuation like ++ and #", () => {
    expect(normalizeSkill("C++")).toBe("c++");
    expect(normalizeSkill("C#")).toBe("c#");
  });

  it("strips unrelated punctuation", () => {
    expect(normalizeSkill("REST APIs!")).toBe("rest apis");
  });

  // Each of these came from a real posting/resume pair, per the roadmap's
  // "grow the alias table from actual mismatches" rule.
  it("collapses ML framework spelling variants", () => {
    expect(normalizeSkill("Transformers")).toBe("transformer");
    expect(normalizeSkill("Torch")).toBe("pytorch");
    expect(normalizeSkill("Tensor Flow")).toBe("tensorflow");
    expect(normalizeSkill("sklearn")).toBe("scikitlearn");
    expect(normalizeSkill("scikit-learn")).toBe("scikitlearn");
  });

  it("expands common ML abbreviations", () => {
    expect(normalizeSkill("ML")).toBe("machine learning");
    expect(normalizeSkill("NLP")).toBe("natural language processing");
  });

  it("does not mangle short skills that merely end in s", () => {
    expect(normalizeSkill("AWS")).toBe("aws");
    expect(normalizeSkill("Kubernetes")).toBe("kubernetes");
  });
});

describe("gapAnalysis", () => {
  it("finds exact matches", () => {
    const result = gapAnalysis(["Python", "FastAPI"], ["Python"]);
    expect(result.matched).toEqual(["Python"]);
    expect(result.missing).toEqual([]);
  });

  it("finds missing skills the job wants but resume lacks", () => {
    const result = gapAnalysis(
      ["Python", "FastAPI", "PyTorch"],
      ["Python", "Docker", "Redis"]
    );
    expect(result.matched).toEqual(["Python"]);
    expect(result.missing).toEqual(["Docker", "Redis"]);
  });

  it("matches skills across alias variants", () => {
    const result = gapAnalysis(["JavaScript", "React"], ["JS", "ReactJS"]);
    expect(result.matched.sort()).toEqual(["JS", "ReactJS"].sort());
    expect(result.missing).toEqual([]);
  });

  it("reports extra resume skills not required by the job", () => {
    const result = gapAnalysis(
      ["Python", "PyTorch", "Kubernetes"],
      ["Python"]
    );
    expect(result.extra.sort()).toEqual(["PyTorch", "Kubernetes"].sort());
  });

  it("computes matchRate correctly", () => {
    const result = gapAnalysis(["Python"], ["Python", "Docker"]);
    expect(result.matchRate).toBe(0.5);
  });

  it("handles an empty job skills list without dividing by zero", () => {
    const result = gapAnalysis(["Python"], []);
    expect(result.matchRate).toBe(0);
    expect(result.matched).toEqual([]);
  });

  it("treats singular and plural framework names as one skill", () => {
    // Regression: a resume listing both "Transformers" and "Transformer"
    // previously produced two separate entries in `extra`.
    const result = gapAnalysis(["Transformers", "Transformer"], ["Transformer"]);
    expect(result.matched).toEqual(["Transformer"]);
    expect(result.extra).toEqual([]);
  });

  it("never fabricates a match — case where nothing overlaps", () => {
    const result = gapAnalysis(["Excel", "PowerPoint"], ["Python", "AWS"]);
    expect(result.matched).toEqual([]);
    expect(result.missing.sort()).toEqual(["AWS", "Python"].sort());
  });
});

describe("categorizeSkill", () => {
  it("treats concrete competencies as core", () => {
    expect(categorizeSkill("TensorFlow")).toBe("core");
    expect(categorizeSkill("Python")).toBe("core");
    expect(categorizeSkill("Docker")).toBe("core");
  });

  it("treats unfalsifiable claims as soft", () => {
    expect(categorizeSkill("Problem Solving")).toBe("soft");
    expect(categorizeSkill("Strong Communication Skills")).toBe("soft");
    expect(categorizeSkill("Team Work")).toBe("soft");
  });

  it("treats maths topics as foundational", () => {
    expect(categorizeSkill("Linear algebra")).toBe("foundational");
    expect(categorizeSkill("Calculus")).toBe("foundational");
    expect(categorizeSkill("Probability")).toBe("foundational");
    expect(categorizeSkill("Advanced statistical analysis")).toBe(
      "foundational"
    );
  });
});

describe("matchRate scoring", () => {
  // Both of these are real postings that scored an identical, misleading 29%
  // under the old flat denominator — 2 matched out of 7, purely by
  // coincidence, while only ONE of the five gaps was a real technical one.
  const resumeSkills = ["Python", "PyTorch", "Docker", "Transformers"];

  it("scores only core skills, not maths or soft skills", () => {
    const result = gapAnalysis(resumeSkills, [
      "Python",
      "PyTorch",
      "TensorFlow",
      "Linear algebra",
      "Calculus",
      "Probability",
      "Advanced statistical analysis",
    ]);

    expect(result.breakdown.coreMatched.sort()).toEqual(["PyTorch", "Python"]);
    expect(result.breakdown.coreMissing).toEqual(["TensorFlow"]);
    expect(result.breakdown.foundationalMissing).toHaveLength(4);

    // 2 of 3 core requirements — not 2 of 7.
    expect(result.matchRate).toBeCloseTo(2 / 3);
  });

  it("keeps every gap in `missing` so the tailoring prompt still sees them", () => {
    const result = gapAnalysis(resumeSkills, [
      "TensorFlow",
      "Calculus",
      "Problem Solving",
    ]);

    // Unscored does not mean unreported — nothing here may be claimed.
    expect(result.missing.sort()).toEqual([
      "Calculus",
      "Problem Solving",
      "TensorFlow",
    ]);
    expect(result.matchRate).toBe(0);
  });

  it("returns 0 when a posting lists only soft skills", () => {
    const result = gapAnalysis(resumeSkills, ["Problem Solving", "Teamwork"]);
    expect(result.breakdown.coreMatched).toEqual([]);
    expect(result.breakdown.coreMissing).toEqual([]);
    expect(result.matchRate).toBe(0);
  });
});
