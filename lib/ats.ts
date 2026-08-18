import type { TailoredOutput, JobJson, GapAnalysisResult } from "@/lib/types";

/**
 * ATS readiness audit — deterministic, NO AI (same rule as gap-analysis).
 *
 * An honest word about what this is. No real applicant tracking system —
 * Workday, Greenhouse, Lever, Taleo — publishes a score to candidates. Tools
 * that show you "your Workday score: 78" are inventing it. What those systems
 * actually do is parse a document into fields and index its text so a
 * recruiter can search by keyword.
 *
 * So this doesn't claim to predict a hidden score. It audits the things that
 * verifiably affect whether a resume parses cleanly and surfaces in a keyword
 * search, and every point is traceable to a named check the user can read and
 * argue with. That's the same reason gap analysis is code and not a model:
 * a number you can't interrogate is worse than no number.
 *
 * Checks that can't be evaluated (a posting with no role title, say) are
 * marked "skipped" and removed from the denominator, so a thin job posting
 * never costs the candidate points.
 */

export type CheckStatus = "pass" | "warn" | "fail" | "skipped";
export type CheckCategory = "keywords" | "structure" | "impact";

export interface AtsCheck {
  id: string;
  label: string;
  category: CheckCategory;
  status: CheckStatus;
  weight: number;
  earned: number;
  detail: string;
  items?: string[];
}

export interface AtsReport {
  score: number; // 0..100 over evaluable checks only
  band: "strong" | "moderate" | "needs work";
  earned: number;
  available: number;
  checks: AtsCheck[];
}

export interface AtsInput {
  tailored: TailoredOutput;
  job: JobJson;
  gap: GapAnalysisResult;
  contact: string;
  education: string[];
}

/** Loose text normaliser for substring search — not the skill normaliser. */
function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9+#. ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const EMAIL = /[^\s@]+@[^\s@]+\.[^\s@]+/;
// Deliberately permissive: international formats vary wildly and a false
// "missing phone" is more annoying than a false pass.
const PHONE = /(\+?\d[\d\s\-().]{7,}\d)/;

const TITLE_STOPWORDS = new Set([
  "a", "an", "and", "the", "of", "for", "to", "in", "at", "with", "or",
  "senior", "junior", "lead", "staff", "principal", "i", "ii", "iii",
]);

const ACTION_VERBS = new Set([
  "led", "built", "designed", "developed", "delivered", "implemented",
  "engineered", "created", "launched", "improved", "increased", "reduced",
  "optimized", "optimised", "automated", "architected", "deployed",
  "migrated", "scaled", "refactored", "analyzed", "analysed", "researched",
  "conducted", "coordinated", "managed", "owned", "drove", "established",
  "introduced", "streamlined", "accelerated", "produced", "published",
  "authored", "trained", "mentored", "supported", "maintained", "monitored",
  "translated", "contributed", "collaborated", "performed", "executed",
  "evaluated", "tested", "integrated", "generated", "achieved", "secured",
  "presented", "facilitated", "transformed", "redesigned", "rebuilt",
  "prototyped", "validated", "benchmarked", "shipped", "spearheaded",
  "orchestrated", "consolidated", "standardized", "standardised",
  "formulated", "devised", "pioneered", "assessed", "documented",
]);

/** A bullet whose only digits are a year isn't a quantified result. */
const ONLY_A_YEAR = /^\D*(19|20)\d{2}\D*$/;
function isQuantified(bullet: string): boolean {
  return /\d/.test(bullet) && !ONLY_A_YEAR.test(bullet);
}

/** Score a 0..1 ratio against the level at which it's considered full marks. */
function ratioScore(ratio: number, target: number, weight: number): number {
  if (target <= 0) return weight;
  return Math.min(1, ratio / target) * weight;
}

function statusFor(earned: number, weight: number): CheckStatus {
  const pct = weight === 0 ? 1 : earned / weight;
  if (pct >= 0.8) return "pass";
  if (pct >= 0.4) return "warn";
  return "fail";
}

const pct = (n: number) => `${Math.round(n * 100)}%`;

export function atsReport({
  tailored,
  job,
  gap,
  contact,
  education,
}: AtsInput): AtsReport {
  const checks: AtsCheck[] = [];

  const bullets = (tailored.experience ?? []).flatMap((e) => e.bullets ?? []);
  const resumeText = normalizeText(
    [
      tailored.summary ?? "",
      ...(tailored.skills ?? []),
      ...(tailored.experience ?? []).flatMap((e) => [
        e.title,
        e.company,
        ...(e.bullets ?? []),
      ]),
    ].join(" ")
  );

  // --- Keywords -----------------------------------------------------------

  const coreMatched = gap.breakdown?.coreMatched ?? gap.matched;
  const coreMissing = gap.breakdown?.coreMissing ?? gap.missing;
  const coreTotal = coreMatched.length + coreMissing.length;

  if (coreTotal === 0) {
    checks.push({
      id: "keyword-coverage",
      label: "Required-skill coverage",
      category: "keywords",
      status: "skipped",
      weight: 30,
      earned: 0,
      detail:
        "This posting didn't list explicit skill requirements, so there was nothing to match against. Not counted in the score.",
    });
  } else {
    const ratio = coreMatched.length / coreTotal;
    const earned = ratio * 30;
    checks.push({
      id: "keyword-coverage",
      label: "Required-skill coverage",
      category: "keywords",
      status: statusFor(earned, 30),
      weight: 30,
      earned,
      detail: `Your resume covers ${coreMatched.length} of ${coreTotal} core skills this posting names (${pct(ratio)}). Recruiters search by these terms, so each missing one is a search you won't appear in.`,
      items: coreMissing,
    });
  }

  // A skill listed but never demonstrated is weak: recruiters full-text
  // search, and a hit inside a real accomplishment reads very differently
  // from a hit in a comma-separated list.
  if (coreMatched.length === 0) {
    checks.push({
      id: "keyword-evidence",
      label: "Skills backed by experience",
      category: "keywords",
      status: "skipped",
      weight: 15,
      earned: 0,
      detail: "No matched skills to check. Not counted in the score.",
    });
  } else {
    const unevidenced = coreMatched.filter((skill) => {
      const needle = normalizeText(skill);
      const inBullets = bullets.some((b) =>
        normalizeText(b).includes(needle)
      );
      const inSummary = normalizeText(tailored.summary ?? "").includes(needle);
      return !inBullets && !inSummary;
    });

    const ratio = 1 - unevidenced.length / coreMatched.length;
    const earned = ratio * 15;
    checks.push({
      id: "keyword-evidence",
      label: "Skills backed by experience",
      category: "keywords",
      status: statusFor(earned, 15),
      weight: 15,
      earned,
      detail: `${coreMatched.length - unevidenced.length} of ${coreMatched.length} matched skills also appear in your summary or a bullet. Skills that only exist in the skills list read as a keyword dump.`,
      items: unevidenced,
    });
  }

  const roleTitle = (job.role ?? "").trim();
  if (!roleTitle) {
    checks.push({
      id: "title-alignment",
      label: "Job title alignment",
      category: "keywords",
      status: "skipped",
      weight: 10,
      earned: 0,
      detail:
        "This posting didn't state a role title. Not counted in the score.",
    });
  } else {
    const words = normalizeText(roleTitle)
      .split(" ")
      .filter((w) => w.length > 1 && !TITLE_STOPWORDS.has(w));
    const hits = words.filter((w) => resumeText.includes(w));
    const ratio = words.length ? hits.length / words.length : 0;
    const earned = ratioScore(ratio, 0.6, 10);

    checks.push({
      id: "title-alignment",
      label: "Job title alignment",
      category: "keywords",
      status: statusFor(earned, 10),
      weight: 10,
      earned,
      detail: `Your resume echoes ${hits.length} of ${words.length} significant words from "${roleTitle}". Title keywords are among the most common recruiter search filters.`,
      items: words.filter((w) => !resumeText.includes(w)),
    });
  }

  // --- Structure ----------------------------------------------------------

  const hasEmail = EMAIL.test(contact);
  const hasPhone = PHONE.test(contact);
  const contactEarned = (hasEmail ? 6 : 0) + (hasPhone ? 4 : 0);
  const missingContact = [
    !hasEmail ? "email address" : null,
    !hasPhone ? "phone number" : null,
  ].filter((v): v is string => Boolean(v));

  checks.push({
    id: "contact",
    label: "Contact details parseable",
    category: "structure",
    status: statusFor(contactEarned, 10),
    weight: 10,
    earned: contactEarned,
    detail: missingContact.length
      ? `No ${missingContact.join(" or ")} detected in your contact line. Parsers that can't find one often drop the candidate record entirely.`
      : "Email and phone both detected — the two fields every parser looks for first.",
    items: missingContact,
  });

  const presentSections = [
    (tailored.experience ?? []).length > 0 ? "Experience" : null,
    (tailored.skills ?? []).length > 0 ? "Skills" : null,
    education.length > 0 ? "Education" : null,
  ];
  const sectionCount = presentSections.filter(Boolean).length;
  const sectionsEarned = (sectionCount / 3) * 10;
  const missingSections = ["Experience", "Skills", "Education"].filter(
    (s) => !presentSections.includes(s)
  );

  checks.push({
    id: "sections",
    label: "Standard sections present",
    category: "structure",
    status: statusFor(sectionsEarned, 10),
    weight: 10,
    earned: sectionsEarned,
    detail: missingSections.length
      ? `Missing: ${missingSections.join(", ")}. Parsers map resumes onto these standard headings.`
      : "Experience, Skills and Education are all present and labelled conventionally.",
    items: missingSections,
  });

  const roles = tailored.experience ?? [];
  if (roles.length === 0) {
    checks.push({
      id: "role-completeness",
      label: "Every role has title, employer and dates",
      category: "structure",
      status: "fail",
      weight: 10,
      earned: 0,
      detail: "No experience entries found.",
    });
  } else {
    const incomplete = roles.filter(
      (r) => !r.title?.trim() || !r.company?.trim() || !r.dates?.trim()
    );
    const ratio = 1 - incomplete.length / roles.length;
    const earned = ratio * 10;

    checks.push({
      id: "role-completeness",
      label: "Every role has title, employer and dates",
      category: "structure",
      status: statusFor(earned, 10),
      weight: 10,
      earned,
      detail: incomplete.length
        ? `${incomplete.length} of ${roles.length} roles are missing a title, employer or date range — the three fields a parser uses to build your work history.`
        : `All ${roles.length} roles carry a title, employer and date range.`,
      items: incomplete.map((r) => r.title || r.company || "Untitled role"),
    });
  }

  // --- Impact -------------------------------------------------------------

  if (bullets.length === 0) {
    checks.push({
      id: "quantified",
      label: "Quantified results",
      category: "impact",
      status: "fail",
      weight: 10,
      earned: 0,
      detail: "No experience bullets to assess.",
    });
    checks.push({
      id: "action-verbs",
      label: "Bullets lead with an action verb",
      category: "impact",
      status: "fail",
      weight: 5,
      earned: 0,
      detail: "No experience bullets to assess.",
    });
  } else {
    const quantified = bullets.filter(isQuantified);
    const qRatio = quantified.length / bullets.length;
    // 40% is the realistic bar — demanding a number in every bullet pushes
    // people into inventing them, which is the one thing this app won't do.
    const qEarned = ratioScore(qRatio, 0.4, 10);

    checks.push({
      id: "quantified",
      label: "Quantified results",
      category: "impact",
      status: statusFor(qEarned, 10),
      weight: 10,
      earned: qEarned,
      detail: `${quantified.length} of ${bullets.length} bullets (${pct(qRatio)}) contain a figure. Aim for roughly 40% — only where you have a real number.`,
    });

    const weak = bullets.filter((b) => {
      const first = normalizeText(b).split(" ")[0] ?? "";
      return !ACTION_VERBS.has(first);
    });
    const vRatio = 1 - weak.length / bullets.length;
    const vEarned = ratioScore(vRatio, 0.8, 5);

    checks.push({
      id: "action-verbs",
      label: "Bullets lead with an action verb",
      category: "impact",
      status: statusFor(vEarned, 5),
      weight: 5,
      earned: vEarned,
      detail: `${bullets.length - weak.length} of ${bullets.length} bullets open with a recognised action verb. Leading with the verb puts the accomplishment first.`,
      items: weak.slice(0, 4),
    });
  }

  // --- Total --------------------------------------------------------------

  const scored = checks.filter((c) => c.status !== "skipped");
  const available = scored.reduce((sum, c) => sum + c.weight, 0);
  const earned = scored.reduce((sum, c) => sum + c.earned, 0);
  const score = available > 0 ? Math.round((earned / available) * 100) : 0;

  return {
    score,
    band: score >= 80 ? "strong" : score >= 60 ? "moderate" : "needs work",
    earned,
    available,
    checks,
  };
}
