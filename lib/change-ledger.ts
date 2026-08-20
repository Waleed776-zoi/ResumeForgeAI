import type { ResumeJson, TailoredOutput, JobJson } from "@/lib/types";

/**
 * Change ledger — a deterministic diff of original vs tailored. NO AI.
 *
 * This is the third code-not-model decision in the pipeline, and the most
 * important one. Asking a model to explain what it changed produces a second
 * claim, not evidence: a model that invented a metric will happily narrate a
 * reason for it. A diff computed from the two documents can be checked
 * against them, line by line, by anyone.
 *
 * What the verdicts mean, stated precisely because a vague "supported" badge
 * would be worse than none:
 *
 *   SUPPORTED — every FIGURE in the tailored text also appears in the
 *   original, and every NAMED SKILL in it appears somewhere in the original
 *   resume. Rewording is expected and is not flagged.
 *
 *   NEEDS REVIEW — the tailored text contains a figure or a named skill that
 *   appears nowhere in the original. That is the shape a fabrication takes.
 *
 * The limit is deliberate and worth knowing: this verifies facts and named
 * skills, not every English word. "Led a team" where the original said
 * "worked with a team" is a claim shift no token comparison can catch — which
 * is exactly why the model-run integrity check still exists alongside it. The
 * two occasionally disagree; when they do, this is the one you can audit.
 */

export type ChangeKind = "reworded" | "added" | "removed" | "unchanged";
export type Verdict = "supported" | "review";

export interface LedgerEntry {
  id: string;
  kind: ChangeKind;
  /** Where in the resume this happened — "Summary", "Skills", or a role. */
  section: string;
  original: string | null;
  tailored: string | null;
  why: string;
  source: string;
  verdict: Verdict;
  /** Figures or skills present in the tailored text but not the original. */
  unsupported: string[];
  /** Terms taken from the job posting's own language. */
  borrowed: string[];
}

export interface ChangeLedger {
  entries: LedgerEntry[];
  stats: {
    total: number;
    reworded: number;
    added: number;
    removed: number;
    unchanged: number;
    needsReview: number;
  };
  /** Dates, job titles and employers are supposed to be untouchable. */
  factsPreserved: boolean;
  alteredFacts: string[];
}

const STOPWORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "by", "for", "from", "has",
  "have", "in", "into", "is", "it", "its", "of", "on", "or", "that", "the",
  "to", "was", "were", "with", "which", "this", "these", "those", "their",
  "they", "them", "our", "using", "used", "use", "also", "while", "within",
  "across", "through", "during", "both", "been", "will", "can", "more",
  "than", "then", "when", "where", "who", "whom", "how", "all", "any",
  "each", "other", "such", "own", "same", "so", "too", "very", "just",
  "but", "not", "no", "nor", "only",
]);

const words = (text: string): string[] =>
  text
    .toLowerCase()
    // Keep . / # - so "node.js", "c/c++" and "c#" survive as single tokens...
    .replace(/[^a-z0-9+#./\s-]/g, " ")
    .split(/\s+/)
    // ...but strip them at the edges, or sentence punctuation welds itself to
    // words and "project." stops matching "project".
    .map((w) => w.replace(/^[.\-/]+|[.\-/]+$/g, ""))
    .filter(Boolean);

const contentWords = (text: string): string[] =>
  words(text).filter((w) => w.length > 2 && !STOPWORDS.has(w));

/**
 * A very light stem, used for MATCHING ONLY — never for display.
 *
 * The posting says "Deploy", the rewritten bullet says "deployed"; without
 * this they are different tokens and the borrowed language goes unhighlighted.
 * Applied only above five characters, because blanket suffix-stripping turns
 * "aws" into "aw" — the same trap the skill normaliser avoids. It does not
 * need to be linguistically correct, only consistent: both sides are stemmed,
 * so "business" becoming "busines" still matches itself.
 */
const stem = (w: string): string =>
  w.length > 5 ? w.replace(/(?:ed|ing|es|s)$/, "") : w;

/** Dice coefficient over content words — 1 is identical, 0 shares nothing. */
function similarity(a: string, b: string): number {
  const A = new Set(contentWords(a));
  const B = new Set(contentWords(b));
  if (A.size === 0 && B.size === 0) return 1;
  if (A.size === 0 || B.size === 0) return 0;

  let shared = 0;
  for (const w of A) if (B.has(w)) shared++;
  return (2 * shared) / (A.size + B.size);
}

/**
 * Figures are the highest-risk fabrication in a resume — "improved throughput
 * by 60%" is either true or it isn't. Percentages, multipliers and measured
 * quantities are captured; bare years are not, since they're dates rather
 * than claims.
 */
function figures(text: string): string[] {
  const found = text.match(/\d+(?:[.,]\d+)?\s*(?:%|x\b|k\b|m\b|bn\b|s\b|ms\b)?/gi);
  if (!found) return [];
  return found
    .map((f) => f.replace(/\s+/g, "").toLowerCase())
    .filter((f) => !/^(19|20)\d{2}$/.test(f));
}

/**
 * Below this, two bullets are treated as unrelated rather than a rewrite.
 *
 * Calibrated against a real pair: "Worked on a medical imaging project. Built
 * the backend..." → "Built and deployed a deep learning medical imaging
 * system to production." scores 0.36 — clearly a rewrite of the same line,
 * yet it shares only three content words. Aggressive tailoring legitimately
 * replaces most of the wording, so a stricter bar reports rewrites as
 * inventions, which is the worst possible error for this feature to make.
 */
const PAIR_THRESHOLD = 0.25;

export function buildChangeLedger({
  original,
  tailored,
  job,
}: {
  original: ResumeJson;
  tailored: TailoredOutput;
  job?: JobJson;
}): ChangeLedger {
  const entries: LedgerEntry[] = [];

  // Everything the candidate actually wrote, as one searchable corpus. A
  // skill moved from the skills list into a bullet is a reorganisation, not
  // an invention, so tracing against the whole document is the honest test.
  const originalCorpus = new Set(
    contentWords(
      [
        original.summary ?? "",
        ...(original.skills ?? []),
        ...(original.education ?? []),
        ...(original.certifications ?? []),
        ...(original.publications ?? []),
        ...(original.experience ?? []).flatMap((e) => [
          e.title,
          e.company,
          ...(e.bullets ?? []),
        ]),
      ].join(" ")
    )
  );

  const originalFigures = new Set(
    figures(
      [
        original.summary ?? "",
        ...(original.experience ?? []).flatMap((e) => e.bullets ?? []),
      ].join(" ")
    )
  );

  const knownSkills = new Set(
    [...(original.skills ?? []), ...(job?.required_skills ?? [])].flatMap(
      contentWords
    )
  );

  const jobStems = new Set(
    contentWords(
      [
        job?.role ?? "",
        ...(job?.required_skills ?? []),
        ...(job?.responsibilities ?? []),
      ].join(" ")
    ).map(stem)
  );

  /** Which figures/skills in `text` can't be traced back to the original. */
  function audit(text: string, pairedOriginal: string | null) {
    const localFigures = new Set(figures(pairedOriginal ?? ""));
    const unsupported: string[] = [];

    for (const f of figures(text)) {
      if (!localFigures.has(f) && !originalFigures.has(f)) unsupported.push(f);
    }
    for (const w of new Set(contentWords(text))) {
      if (knownSkills.has(w) && !originalCorpus.has(w)) unsupported.push(w);
    }

    // Borrowed = vocabulary from the posting that wasn't in the line this
    // was rewritten from. Whether the underlying CLAIM is supported is a
    // different question, answered above by the figure and skill checks —
    // conflating the two made this set almost always empty.
    const pairedStems = new Set(contentWords(pairedOriginal ?? "").map(stem));
    const borrowed = [...new Set(contentWords(text))].filter(
      (w) => jobStems.has(stem(w)) && !pairedStems.has(stem(w))
    );

    return { unsupported: [...new Set(unsupported)], borrowed };
  }

  function explain(
    kind: ChangeKind,
    tailoredText: string,
    originalText: string | null,
    borrowed: string[],
    unsupported: string[]
  ): string {
    if (kind === "removed") {
      return "Present in your resume but not carried into the tailored version. Nothing was invented here — content was left out.";
    }
    if (kind === "unchanged") {
      return "Carried over word for word.";
    }
    if (kind === "added") {
      return unsupported.length > 0
        ? "No matching line in your original, and it introduces details that appear nowhere in your resume. Read this one closely."
        : "No closely matching line in your original, though every figure and named skill in it does trace back to your resume.";
    }

    const parts: string[] = [];

    if (borrowed.length > 0) {
      const quoted = borrowed
        .slice(0, 4)
        .map((b) => `"${b}"`)
        .join(", ");
      parts.push(`adopted the posting's wording for ${quoted}`);
    }

    const originalFigureList = figures(originalText ?? "");
    const kept = figures(tailoredText).filter((f) =>
      originalFigureList.includes(f)
    );
    if (kept.length > 0) {
      parts.push(`kept every figure unchanged (${kept.join(", ")})`);
    }

    const before = contentWords(originalText ?? "").length;
    const after = contentWords(tailoredText).length;
    if (before > 0 && after < before * 0.8) parts.push("tightened the phrasing");
    else if (before > 0 && after > before * 1.25) parts.push("expanded on it");

    if (parts.length === 0) {
      return "Rephrased without changing what it claims.";
    }

    const sentence = parts.join("; ");
    return `${sentence.charAt(0).toUpperCase()}${sentence.slice(1)}.`;
  }

  /**
   * The provenance line, which has to stay honest under flagging.
   *
   * A fabricated skill lifted from the job posting technically DOES use the
   * posting's vocabulary — but labelling it "your resume, reworded" is the
   * exact opposite of what happened, and it is the one line a hurried reader
   * will trust. Untraceable content says so first, before anything else.
   */
  function sourceFor(
    kind: ChangeKind,
    unsupported: string[],
    borrowed: string[]
  ): string {
    if (unsupported.length > 0) {
      return "Not traceable to your resume — verify before sending";
    }
    if (kind === "removed") return "Your resume (omitted from the tailored version)";
    if (borrowed.length > 0) {
      return "Your resume, reworded with the posting's vocabulary";
    }
    return "Your resume";
  }

  function push(
    kind: ChangeKind,
    section: string,
    originalText: string | null,
    tailoredText: string | null
  ) {
    const { unsupported, borrowed } = tailoredText
      ? audit(tailoredText, originalText)
      : { unsupported: [] as string[], borrowed: [] as string[] };

    entries.push({
      id: `${section}-${entries.length}`,
      kind,
      section,
      original: originalText,
      tailored: tailoredText,
      why: explain(kind, tailoredText ?? "", originalText, borrowed, unsupported),
      source: sourceFor(kind, unsupported, borrowed),
      // A removal can never fabricate anything, so it is always supported.
      verdict:
        kind === "removed"
          ? "supported"
          : unsupported.length > 0
            ? "review"
            : "supported",
      unsupported,
      borrowed,
    });
  }

  // --- Summary ---------------------------------------------------------
  if (original.summary?.trim() || tailored.summary?.trim()) {
    const identical =
      similarity(original.summary ?? "", tailored.summary ?? "") >= 0.98;
    push(
      identical ? "unchanged" : "reworded",
      "Summary",
      original.summary?.trim() || null,
      tailored.summary?.trim() || null
    );
  }

  // --- Skills newly present in the list --------------------------------
  const originalSkillSet = new Set(
    (original.skills ?? []).map((s) => s.toLowerCase().trim())
  );
  for (const skill of tailored.skills ?? []) {
    if (!originalSkillSet.has(skill.toLowerCase().trim())) {
      push("added", "Skills", null, skill);
    }
  }

  // --- Experience, role by role ----------------------------------------
  const originalRoles = new Map(
    (original.experience ?? []).map((e) => [
      `${e.title}||${e.company}`.toLowerCase(),
      e,
    ])
  );
  const alteredFacts: string[] = [];

  for (const role of tailored.experience ?? []) {
    const key = `${role.title}||${role.company}`.toLowerCase();
    const sourceRole = originalRoles.get(key);
    const section = role.company
      ? `${role.title} — ${role.company}`
      : role.title;

    if (!sourceRole) {
      // Titles and employers must be preserved exactly, so a role that
      // matches nothing in the original is a serious discrepancy.
      alteredFacts.push(section);
      for (const bullet of role.bullets ?? []) {
        push("added", section, null, bullet);
      }
      continue;
    }

    if ((sourceRole.dates ?? "").trim() !== (role.dates ?? "").trim()) {
      alteredFacts.push(
        `${section} — dates changed from "${sourceRole.dates}" to "${role.dates}"`
      );
    }

    // Greedy nearest-match: each tailored bullet claims the most similar
    // unclaimed original, so a reordered list still pairs correctly.
    const unclaimed = [...(sourceRole.bullets ?? [])];
    for (const bullet of role.bullets ?? []) {
      let bestIndex = -1;
      let best = 0;
      unclaimed.forEach((candidate, i) => {
        const score = similarity(candidate, bullet);
        if (score > best) {
          best = score;
          bestIndex = i;
        }
      });

      if (bestIndex >= 0 && best >= PAIR_THRESHOLD) {
        const [matched] = unclaimed.splice(bestIndex, 1);
        push(best >= 0.98 ? "unchanged" : "reworded", section, matched, bullet);
      } else {
        push("added", section, null, bullet);
      }
    }

    for (const dropped of unclaimed) push("removed", section, dropped, null);
  }

  return {
    entries,
    stats: {
      total: entries.length,
      reworded: entries.filter((e) => e.kind === "reworded").length,
      added: entries.filter((e) => e.kind === "added").length,
      removed: entries.filter((e) => e.kind === "removed").length,
      unchanged: entries.filter((e) => e.kind === "unchanged").length,
      needsReview: entries.filter((e) => e.verdict === "review").length,
    },
    factsPreserved: alteredFacts.length === 0,
    alteredFacts,
  };
}
