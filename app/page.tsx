import Link from "next/link";
import { UploadForm } from "@/components/UploadForm";
import { Hero } from "@/components/Hero";
import { TransformationScene } from "@/components/TransformationScene";
import { createClient } from "@/lib/supabase/server";

/**
 * Three screens, in the order a stranger actually needs them: what this is
 * and what to click; how it works on a real line; then the thing itself.
 *
 * The shell is max-w-5xl rather than the max-w-3xl the document pages use,
 * because this page argues in pairs — claim beside evidence, explanation
 * beside demonstration — and a 768px column cannot hold a pair without
 * stacking it. Reading measure is protected inside each column rather than by
 * the shell: no prose track here runs much past 70 characters, which is why
 * the copy columns are capped well below the width available to them.
 */
export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <Hero signedIn={!!user} />

      {/* The demonstration, moved one screen down so it plays for someone who
          chose to see it. This is what the scroll-hold in lib/use-reveal.ts
          was built for — above the fold it had nothing to wait for. */}
      <section id="how" className="mt-28 scroll-mt-24">
        {/* Paired the same way the hero is, so the page keeps one rhythm
            instead of alternating between split and full-width bands. */}
        <div className="grid gap-10 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:items-start lg:gap-14">
          <div>
            <p className="eyebrow mb-3 text-ink-soft">Line by line</p>
            <h2 className="mb-4 font-display text-[clamp(1.9rem,3.6vw,2.5rem)] leading-[1.12] tracking-display">
              Every phrase it borrows, it shows you.
            </h2>
            <p className="text-[15px] leading-[1.75] text-ink-soft">
              Matching a role means speaking its vocabulary. It does not mean
              acquiring its achievements. Here is that distinction on a single
              line of a real resume.
            </p>
          </div>

          <TransformationScene />
        </div>
      </section>

      {/* The form goes back to a narrow measure. Wide inputs read as a form
          to be endured; this one is two fields and should look like two. */}
      <section
        id="tailor"
        className="mx-auto mt-28 max-w-2xl scroll-mt-24 border-t border-line pt-12"
      >
        {user ? (
          <UploadForm />
        ) : (
          <div className="panel px-6 py-8 text-center">
            <p className="mx-auto mb-5 max-w-md text-sm leading-relaxed text-ink-soft">
              Sign in to try it on your own resume — each tailored application
              is saved to your account, so generating one means knowing who you
              are.
            </p>
            <Link
              href="/login"
              className="inline-block rounded bg-accent px-6 py-3 text-sm font-medium text-paper transition-colors hover:bg-accent-bright"
            >
              Sign in to continue
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}
