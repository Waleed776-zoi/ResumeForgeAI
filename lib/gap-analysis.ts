/**
 * Deterministic gap analysis — NO AI, by design.
 *
 * Compares a resume's skill list against a job posting's required skills
 * and returns matched / missing / extra skills. Pure function, fully
 * unit-testable, zero API cost, zero hallucination risk.
 *
 * Grow SKILL_ALIASES as you encounter real mismatches during testing.
 * Do not be tempted to swap this for an AI call — see roadmap notes.
 */

// Hand-maintained alias table. Left side = normalized variant, right side = canonical form.
export const SKILL_ALIASES: Record<string, string> = {
  js: "javascript",
  reactjs: "react",
  "react.js": "react",
  node: "nodejs",
  "node.js": "nodejs",
  py: "python",
  postgres: "postgresql",
  k8s: "kubernetes",
  ts: "typescript",
  "next.js": "nextjs",
  next: "nextjs",
  golang: "go",

  // Added from real ML/AI postings. Plurals are handled here rather than by
  // stemming: blanket suffix-stripping would turn "aws" into "aw" and
  // "kubernetes" into "kubernete", which is worse than the problem.
  transformers: "transformer",
  torch: "pytorch",
  "py torch": "pytorch",
  "tensor flow": "tensorflow",
  tf: "tensorflow",
  // "scikit-learn" already normalizes to "scikitlearn" once punctuation is
  // stripped, so only the spaced and abbreviated forms need an entry.
  sklearn: "scikitlearn",
  "scikit learn": "scikitlearn",
  ml: "machine learning",
  dl: "deep learning",
  nlp: "natural language processing",
};

/**
 * Not every line in a "Requirements & Skills" block is a skill you can
 * either have or lack.
 *
 * - `soft` — "Problem Solving", "Communication". Every candidate claims
 *   these and no resume comparison can falsify them. Scoring them is noise.
 * - `foundational` — "Linear algebra", "Probability". Real requirements,
 *   but ones a relevant degree already implies; they belong on screen as a
 *   prompt to check, not as a red gap next to a framework you've never used.
 * - `core` — concrete, checkable competencies. Only these are scored.
 *
 * Hand-maintained on purpose, exactly like SKILL_ALIASES: a wrong bucket is
 * a one-line fix plus a test, and the whole thing stays deterministic.
 * Matched as substrings of the normalized skill, so "Advanced statistical
 * analysis" is caught by "statistical".
 */
const SOFT_SKILL_PATTERNS = [
  "problem solving",
  "communication",
  "teamwork",
  "team work",
  "collaboration",
  "time management",
  "leadership",
  "attention to detail",
  "interpersonal",
  "adaptability",
  "critical thinking",
  "work ethic",
  "self motivated",
  "organizational skills",
];

const FOUNDATIONAL_PATTERNS = [
  "linear algebra",
  "calculus",
  "probability",
  "statistics",
  "statistical",
  "discrete math",
  "mathematic",
  "differential equations",
  "numerical methods",
];

export type SkillCategory = "core" | "soft" | "foundational";

export function categorizeSkill(raw: string): SkillCategory {
  const normalized = normalizeSkill(raw);

  if (SOFT_SKILL_PATTERNS.some((p) => normalized.includes(p))) return "soft";
  if (FOUNDATIONAL_PATTERNS.some((p) => normalized.includes(p))) {
    return "foundational";
  }
  return "core";
}

export interface GapAnalysisResult {
  matched: string[];
  missing: string[];
  extra: string[];
  /**
   * 0..1 over CORE skills only. Averaging a framework you lack together with
   * "Problem Solving" and three maths topics produces a number that is
   * arithmetically right and professionally meaningless.
   */
  matchRate: number;
  breakdown: {
    coreMatched: string[];
    coreMissing: string[];
    softMissing: string[];
    foundationalMissing: string[];
  };
}

/**
 * Normalizes a raw skill string for comparison:
 * - lowercases
 * - trims whitespace
 * - strips punctuation except +, ., # (needed for "c++", "node.js", "c#")
 * - resolves known aliases to a canonical form
 */
export function normalizeSkill(raw: string): string {
  const cleaned = raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9+.# ]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  return SKILL_ALIASES[cleaned] ?? cleaned;
}

/**
 * Compares resume skills against job-required skills.
 * Returns matched/missing/extra using canonical (post-alias) names for
 * matched/missing, but preserves the job posting's original casing/wording
 * in the output where possible for a more natural-reading UI.
 */
export function gapAnalysis(
  resumeSkills: string[],
  jobSkills: string[]
): GapAnalysisResult {
  const resumeMap = new Map<string, string>(); // normalized -> original
  for (const skill of resumeSkills) {
    const norm = normalizeSkill(skill);
    if (norm) resumeMap.set(norm, skill);
  }

  const jobMap = new Map<string, string>();
  for (const skill of jobSkills) {
    const norm = normalizeSkill(skill);
    if (norm) jobMap.set(norm, skill);
  }

  const matched: string[] = [];
  const missing: string[] = [];
  const coreMatched: string[] = [];
  const coreMissing: string[] = [];
  const softMissing: string[] = [];
  const foundationalMissing: string[] = [];

  for (const [norm, original] of jobMap.entries()) {
    const isMatched = resumeMap.has(norm);
    const category = categorizeSkill(original);

    // The full lists stay category-blind: the tailoring prompt must be told
    // never to claim ANY missing skill, scored or not.
    if (isMatched) {
      matched.push(original);
      if (category === "core") coreMatched.push(original);
      continue;
    }

    missing.push(original);
    if (category === "core") coreMissing.push(original);
    else if (category === "soft") softMissing.push(original);
    else foundationalMissing.push(original);
  }

  const extra: string[] = [];
  for (const [norm, original] of resumeMap.entries()) {
    if (!jobMap.has(norm)) {
      extra.push(original);
    }
  }

  const scored = coreMatched.length + coreMissing.length;
  const matchRate = scored > 0 ? coreMatched.length / scored : 0;

  return {
    matched,
    missing,
    extra,
    matchRate,
    breakdown: { coreMatched, coreMissing, softMissing, foundationalMissing },
  };
}
