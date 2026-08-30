import { atsReport } from "@/lib/ats";
import { gapAnalysis } from "@/lib/gap-analysis";
import { ReadinessCard } from "@/components/ReadinessCard";
import type { DemoApplication } from "@/lib/demo-application";

/**
 * Runs the real audit on the landing page.
 *
 * This is a Server Component on purpose. atsReport pulls in gap-analysis and
 * its alias table, which has no business in the landing page's JavaScript
 * bundle — so the report is computed during render and only the finished
 * object crosses to the client, where ReadinessCard animates it. The visitor
 * downloads a score, not a scoring engine.
 *
 * Nothing here is a mock-up. The number this renders is whatever
 * lib/ats.ts returns today for the resume shown further up the page; change a
 * weight in the audit and this section changes with it.
 */
export function ReadinessPreview({ demo }: { demo: DemoApplication }) {
  const gap = gapAnalysis(demo.original.skills, demo.job.required_skills);

  const report = atsReport({
    tailored: demo.tailored,
    job: demo.job,
    gap,
    contact: demo.original.contact,
    education: demo.original.education,
  });

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-center lg:gap-14">
      {/* Card first on wide screens — the page has led with copy twice now,
          and the argument in this section is the artefact itself. On narrow
          screens the copy still comes first, because a bare scorecard with no
          preamble is a number without a claim attached. */}
      <div className="order-2 lg:order-1">
        <ReadinessCard report={report} />
      </div>

      <div className="order-1 lg:order-2">
        <p className="eyebrow mb-3 text-ink-soft">Readiness</p>
        <h2 className="mb-5 font-display text-[clamp(1.9rem,3.6vw,2.5rem)] leading-[1.12] tracking-display">
          Scored on things that are actually checkable.
        </h2>

        <p className="mb-4 text-[15px] leading-[1.75] text-ink-soft">
          A deterministic readiness audit — not an imaginary employer ATS
          score. No applicant tracking system publishes a number to
          candidates, so anything that shows you &ldquo;your Workday score:
          78&rdquo; invented it.
        </p>

        <p className="mb-4 text-[15px] leading-[1.75] text-ink-soft">
          This measures what verifiably affects whether a resume parses
          cleanly and turns up in a recruiter&rsquo;s keyword search. Eight
          weighted checks, each one named, each one arguable.
        </p>

        <p className="font-mono text-[11px] leading-relaxed text-ink-soft">
          Computed live from the example above — not a screenshot.
        </p>
      </div>
    </div>
  );
}
