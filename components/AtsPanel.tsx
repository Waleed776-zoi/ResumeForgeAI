import { Check, AlertTriangle, X, Minus } from "lucide-react";
import type { AtsReport, AtsCheck, CheckCategory } from "@/lib/ats";

const CATEGORY_LABELS: Record<CheckCategory, string> = {
  keywords: "Keywords & searchability",
  structure: "Parsing & structure",
  impact: "Writing impact",
};

const STATUS_STYLE = {
  pass: { icon: Check, className: "text-accent" },
  warn: { icon: AlertTriangle, className: "text-flag/80" },
  fail: { icon: X, className: "text-flag" },
  skipped: { icon: Minus, className: "text-ink-soft/50" },
} as const;

function CheckRow({ check }: { check: AtsCheck }) {
  const { icon: Icon, className } = STATUS_STYLE[check.status];
  const skipped = check.status === "skipped";

  return (
    <li className="flex gap-3">
      <Icon size={15} className={`${className} shrink-0 mt-0.5`} />
      <div className="min-w-0">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className={skipped ? "text-ink-soft" : "text-ink font-medium"}>
            {check.label}
          </span>
          <span className="text-xs text-ink-soft tabular-nums">
            {skipped
              ? "not applicable"
              : `${Math.round(check.earned)}/${check.weight}`}
          </span>
        </div>

        <p className="text-ink-soft text-sm mt-0.5 leading-relaxed">
          {check.detail}
        </p>

        {check.items && check.items.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {check.items.map((item) => (
              <span
                key={item}
                className="bg-line/40 text-ink-soft text-xs px-2 py-0.5 rounded-sm"
              >
                {item}
              </span>
            ))}
          </div>
        )}
      </div>
    </li>
  );
}

export function AtsPanel({ report }: { report: AtsReport }) {
  const bandClass =
    report.band === "strong"
      ? "text-accent"
      : report.band === "moderate"
        ? "text-ink"
        : "text-flag";

  const categories: CheckCategory[] = ["keywords", "structure", "impact"];

  return (
    <div className="border border-line rounded bg-white p-6">
      <div className="flex items-baseline justify-between gap-4">
        <h3 className="font-serif text-lg">ATS readiness</h3>
        <div className="text-right">
          <span className={`text-2xl font-serif ${bandClass}`}>
            {report.score}
          </span>
          <span className="text-ink-soft text-sm">/100</span>
        </div>
      </div>

      <div className="h-1 bg-line/50 rounded-sm overflow-hidden mt-3 mb-3">
        <div
          className={`h-full ${report.band === "needs work" ? "bg-flag" : "bg-accent"}`}
          style={{ width: `${report.score}%` }}
        />
      </div>

      {/* Said plainly, because the alternative is implying an authority this
          number doesn't have. */}
      <p className="text-ink-soft text-xs leading-relaxed mb-6">
        No real applicant tracking system publishes a score to candidates —
        anything claiming to be “your Workday score” is invented. This is an
        audit of what measurably affects whether your resume parses cleanly
        and turns up in a recruiter&apos;s keyword search. Every point below is
        traceable to a named check, and checks that don&apos;t apply are left
        out of the total rather than counted against you.
      </p>

      <div className="space-y-6">
        {categories.map((category) => {
          const checks = report.checks.filter((c) => c.category === category);
          if (!checks.length) return null;

          return (
            <section key={category}>
              <h4 className="text-xs font-medium text-ink-soft uppercase tracking-widest mb-3">
                {CATEGORY_LABELS[category]}
              </h4>
              <ul className="space-y-4 text-sm">
                {checks.map((check) => (
                  <CheckRow key={check.id} check={check} />
                ))}
              </ul>
            </section>
          );
        })}
      </div>

      <p className="text-ink-soft/70 text-xs mt-6 pt-4 border-t border-line">
        The PDF and DOCX this app produces are already single-column, real
        text, no tables or images — the formatting choices that actually break
        parsers. This score grades your content, not the file.
      </p>
    </div>
  );
}
