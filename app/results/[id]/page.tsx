import { createClient } from "@/lib/supabase/server";
import { GapAnalysisPanel } from "@/components/GapAnalysisPanel";
import { IntegrityBadge } from "@/components/IntegrityBadge";
import { AtsPanel } from "@/components/AtsPanel";
import { atsReport } from "@/lib/ats";
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

  // Computed here rather than stored at generation time. Every input is
  // already persisted, atsReport is pure, and recomputing means applications
  // generated months ago are graded by today's rules instead of being frozen
  // against an older, worse rubric. It also means no migration.
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
        <p className="text-accent text-xs font-medium tracking-widest uppercase mb-2">
          {applicationTitle(application)}
        </p>
        <h1 className="font-serif text-3xl mb-4">Your tailored application</h1>
        {/* These are the fact-checker's own findings, not the keyword diff
            in `explainability` — a badge that says "verified" has to show
            what the verification actually objected to. */}
        <IntegrityBadge
          passed={application.integrity_passed}
          flaggedItems={application.integrity_flagged_items ?? []}
        />
      </header>

      <GapAnalysisPanel result={application.gap_analysis} />

      <AtsPanel report={ats} />

      <section className="border border-line rounded bg-white p-6">
        <h2 className="font-serif text-xl mb-4">Tailored resume</h2>
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

      <section className="border border-line rounded bg-white p-6">
        <h2 className="font-serif text-xl mb-4">Cover letter</h2>
        <p className="text-sm whitespace-pre-line leading-relaxed">
          {application.cover_letter}
        </p>
      </section>

      <div className="flex flex-wrap gap-3">
        <a
          href={`/api/export/docx?id=${application.id}`}
          className="bg-accent text-white px-6 py-3 rounded font-medium hover:bg-accent/90 transition-colors text-sm"
        >
          Download DOCX
        </a>
        <a
          href={`/api/export/pdf?id=${application.id}`}
          className="border border-line px-6 py-3 rounded font-medium hover:border-accent transition-colors text-sm"
        >
          Download PDF
        </a>
      </div>

      {/* The end of a finished application is the most likely place to start
          the next one — so say so, rather than relying on the browser's
          back button. */}
      <div className="border-t border-line pt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-accent hover:opacity-80 transition-opacity font-medium"
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
