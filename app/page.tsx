import Link from "next/link";
import { UploadForm } from "@/components/UploadForm";
import { createClient } from "@/lib/supabase/server";
import { ShieldCheck } from "lucide-react";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="max-w-2xl mx-auto px-6 py-16">
      <header className="mb-12">
        {/* Account controls live in SiteHeader now — this stays a statement
            of intent rather than a second navigation bar. */}
        <div className="inline-flex items-center gap-2 text-accent text-xs font-medium tracking-widest uppercase mb-4">
          <ShieldCheck size={14} />
          Truthful by design
        </div>

        <h1 className="font-serif text-4xl leading-tight mb-3">
          Tailor your resume to this job.
        </h1>
        <p className="text-ink-soft text-lg leading-relaxed">
          Upload your resume, paste the job posting. You get back a
          tailored resume and cover letter — every claim traceable back to
          what you actually wrote, verified before you see it.
        </p>
      </header>

      {user ? (
        <UploadForm />
      ) : (
        <div className="border border-line rounded bg-white px-6 py-8 text-center">
          <p className="text-ink-soft text-sm mb-5">
            Sign in first — your tailored resumes are saved to your account,
            so generating one requires knowing who you are.
          </p>
          <Link
            href="/login"
            className="inline-block bg-accent text-white px-6 py-3 rounded font-medium hover:bg-accent/90 transition-colors text-sm"
          >
            Sign in to continue
          </Link>
        </div>
      )}
    </main>
  );
}
