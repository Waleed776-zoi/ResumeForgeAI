import { createClient } from "@/lib/supabase/server";
import { GapAnalysisPanel } from "@/components/GapAnalysisPanel";
import { IntegrityBadge } from "@/components/IntegrityBadge";
import { AtsPanel } from "@/components/AtsPanel";
import { TemplatePicker } from "@/components/TemplatePicker";
import { CoverLetterActions } from "@/components/CoverLetterActions";
import { atsReport } from "@/lib/ats";
import { ChangeLedgerPanel } from "@/components/ChangeLedgerPanel";
import { buildChangeLedger } from "@/lib/change-ledger";
import { applicationTitle } from "@/lib/display";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function ResultsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: application, error } = await supabase
    .from("applications")
    .select("*, base_resumes(resume_json)")
    .eq("id", id)
    .single();

  if (error || !application) {
    notFound();
  }

  const tailored = application.tailored_resume_json;
  const baseResume = application.base_resumes?.resume_json;

  // Both of these are computed on view rather than stored at generation
  // time. Every input is already persisted and both functions are pure, so
  // applications generated months ago get today's rules instead of being
  // frozen against an older, worse rubric — and there is no migration.
  const ledger = baseResume
    ? buildChangeLedger({
        original: baseResume,
        tailored,
        job: application.job_json ?? undefined,
      })
    : null;

  const ats = atsReport({
    tailored,
    job: application.job_json ?? {},
    gap: application.gap_analysis,
    contact: baseResume?.contact ?? "",
    education: baseResume?.education ?? [],
  });

  return (
    <main className="max-w-3xl mx-auto px-6 py-16 space-y-10">
      <header>
        <p className="eyebrow text-accent mb-3">
          {applicationTitle(application)}
        </p>
        <h1 className="font-display text-[2.4rem] leading-[1.1] tracking-display mb-5">Your tailored application</h1>
        {/* These are the fact-checker's own findings, not the keyword diff
            in `explainability` — a badge that says "verified" has to show
            what the verification actually objected to. */}
        <IntegrityBadge
          passed={application.integrity_passed}
          flaggedItems={application.integrity_flagged_items ?? []}
        />
      </header>

      <GapAnalysisPanel result={application.gap_analysis} />

      {/* The ledger sits directly under the integrity badge: the badge is the
          model's verdict, this is the evidence behind it. */}
      {ledger && <ChangeLedgerPanel ledger={ledger} />}

      <AtsPanel report={ats} />

      <section className="panel p-7">
        <h2 className="font-display text-[22px] mb-5">Tailored resume</h2>
        <p className="text-ink-soft text-sm mb-6">{tailored.summary}</p>

        <h3 className="text-sm font-medium text-ink-soft uppercase tracking-wide mb-2">
          Skills
        </h3>
        <p className="text-sm mb-6">{tailored.skills.join(" · ")}</p>

        <h3 className="text-sm font-medium text-ink-soft uppercase tracking-wide mb-2">
          Experience
        </h3>
        <div className="space-y-5">
          {tailored.experience.map(
            (
              exp: { title: string; company: string; dates: string; bullets: string[] },
              i: number
            ) => (
              <div key={i}>
                <p className="font-medium">
                  {exp.title} — {exp.company}
                </p>
                <p className="text-ink-soft text-xs mb-2">{exp.dates}</p>
                <ul className="list-disc list-inside text-sm space-y-1">
                  {exp.bullets.map((b, j) => (
                    <li key={j}>{b}</li>
                  ))}
                </ul>
              </div>
            )
          )}
        </div>
      </section>

      <section className="panel p-7">
        <h2 className="font-display text-[22px] mb-5">Cover letter</h2>
        <p className="text-sm whitespace-pre-line leading-relaxed">
          {application.cover_letter}
        </p>

        {/* Only offered when there is something to download — an export that
            returns an empty letter is worse than no button. */}
        {application.cover_letter?.trim() && (
          <CoverLetterActions applicationId={application.id} />
        )}
      </section>

      <TemplatePicker applicationId={application.id} />

      {/* The end of a finished application is the most likely place to start
          the next one — so say so, rather than relying on the browser's
          back button. */}
      <div className="border-t border-line pt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-ink hover:text-accent transition-colors font-medium"
        >
          <ArrowLeft size={14} />
          Tailor another resume
        </Link>
        <Link
          href="/history"
          className="text-ink-soft hover:text-accent transition-colors"
        >
          View all applications
        </Link>
      </div>
    </main>
  );
}
