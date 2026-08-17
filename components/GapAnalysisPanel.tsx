"use client";

import { useState } from "react";
import { Check, X, Plus, GraduationCap, MessageCircle } from "lucide-react";
import type { GapAnalysisResult } from "@/lib/types";

const EXTRA_PREVIEW_COUNT = 8;

function Chip({
  children,
  tone,
  icon,
}: {
  children: string;
  tone: "matched" | "missing" | "neutral";
  icon: React.ReactNode;
}) {
  const toneClass = {
    matched: "bg-accent-soft text-accent",
    missing: "bg-flag/10 text-flag",
    neutral: "bg-line/40 text-ink-soft",
  }[tone];

  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-sm ${toneClass}`}
    >
      {icon} {children}
    </span>
  );
}

function Group({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-ink-soft mb-1.5">
        {label}
        {hint && <span className="text-ink-soft/70"> — {hint}</span>}
      </p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

// This panel renders instantly — the data behind it comes from a pure
// function (lib/gap-analysis.ts), not an API call, so there's no loading
// state to design around here.
export function GapAnalysisPanel({ result }: { result: GapAnalysisResult }) {
  const [showAllExtra, setShowAllExtra] = useState(false);

  // Rows written before the categorised breakdown existed still render —
  // they just fall back to the flat matched/missing lists.
  const breakdown = result.breakdown;
  const coreMatched = breakdown?.coreMatched ?? result.matched;
  const coreMissing = breakdown?.coreMissing ?? result.missing;
  const softMissing = breakdown?.softMissing ?? [];
  const foundationalMissing = breakdown?.foundationalMissing ?? [];

  const scoredCount = coreMatched.length + coreMissing.length;
  const percent = Math.round(result.matchRate * 100);

  // The parser is told never to infer, so a posting written purely as
  // responsibilities yields no explicit skill list — and 0 of 0 matched
  // reads as 0%. That's arithmetically true and completely misleading.
  const postingListedNoSkills =
    result.matched.length === 0 && result.missing.length === 0;

  const visibleExtra = showAllExtra
    ? result.extra
    : result.extra.slice(0, EXTRA_PREVIEW_COUNT);
  const hiddenExtraCount = result.extra.length - visibleExtra.length;

  return (
    <div className="border border-line rounded bg-white p-6">
      <div className="flex items-baseline justify-between gap-4 mb-1">
        <h3 className="font-serif text-lg">Skill match</h3>
        <span className="text-2xl font-serif text-accent">
          {postingListedNoSkills || scoredCount === 0 ? "—" : `${percent}%`}
        </span>
      </div>

      {!postingListedNoSkills && scoredCount > 0 && (
        <p className="text-ink-soft text-xs mb-4">
          {coreMatched.length} of {scoredCount} core technical requirements.
          Maths fundamentals and soft skills are listed below but not scored.
        </p>
      )}

      {postingListedNoSkills && (
        <p className="text-ink-soft text-sm mb-4">
          This posting didn&apos;t list any explicit skill requirements, so
          there was nothing to match against. Paste the full posting including
          its requirements or qualifications section to get a real score.
        </p>
      )}

      <div className="space-y-4 text-sm">
        {coreMatched.length > 0 && (
          <Group label="Matched">
            {coreMatched.map((skill) => (
              <Chip key={skill} tone="matched" icon={<Check size={12} />}>
                {skill}
              </Chip>
            ))}
          </Group>
        )}

        {coreMissing.length > 0 && (
          <Group
            label="Missing"
            hint="this job wants these; don't claim them if they aren't true"
          >
            {coreMissing.map((skill) => (
              <Chip key={skill} tone="missing" icon={<X size={12} />}>
                {skill}
              </Chip>
            ))}
          </Group>
        )}

        {foundationalMissing.length > 0 && (
          <Group
            label="Fundamentals"
            hint="often implied by your degree — confirm your resume shows them"
          >
            {foundationalMissing.map((skill) => (
              <Chip key={skill} tone="neutral" icon={<GraduationCap size={12} />}>
                {skill}
              </Chip>
            ))}
          </Group>
        )}

        {softMissing.length > 0 && (
          <Group label="Soft skills" hint="not scored — everyone claims these">
            {softMissing.map((skill) => (
              <Chip key={skill} tone="neutral" icon={<MessageCircle size={12} />}>
                {skill}
              </Chip>
            ))}
          </Group>
        )}

        {result.extra.length > 0 && (
          <Group label="You have these, but the posting didn't ask">
            {visibleExtra.map((skill) => (
              <Chip key={skill} tone="neutral" icon={<Plus size={12} />}>
                {skill}
              </Chip>
            ))}
            {hiddenExtraCount > 0 && (
              <button
                type="button"
                onClick={() => setShowAllExtra(true)}
                className="text-accent underline px-1"
              >
                +{hiddenExtraCount} more
              </button>
            )}
          </Group>
        )}
      </div>
    </div>
  );
}
