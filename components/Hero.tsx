import Link from "next/link";
import { ArrowRight, ArrowDown, ShieldCheck } from "lucide-react";
import { SparklesCore } from "@/components/ui/sparkles";
import { MatchPreview } from "@/components/MatchPreview";
import { ReplayLink } from "@/components/ReplayLink";
import { REWRITE_SCENE } from "@/lib/scene-replay";
import { gapAnalysis } from "@/lib/gap-analysis";
import { DEMO_ORIGINAL, DEMO_JOB } from "@/lib/demo-application";

/**
 * First viewport: the promise and the action on the left, the proof on the
 * right, and nothing below the fold that a visitor needs in order to decide.
 *
 * The 55/45 split is what the shell width is for. A centred stack inside a
 * 768px column left two dead margins and stacked the card below the CTA,
 * which pushed the one piece of evidence off the fold on a laptop; side by
 * side, the claim and its demonstration are read together.
 *
 * The split only exists at `lg`. Below that the card follows the copy in a
 * single column, because a 45% card on a phone is a thumbnail.
 *
 * No wordmark above the eyebrow: the sticky header carries it on the same
 * screen, and printing it twice reads as a page that lost its place.
 */
export function Hero({ signedIn }: { signedIn: boolean }) {
  // The real matcher, run on the server: the alias table it consults has no
  // business in the landing page's bundle, and hand-writing which chips are
  // green would let the hero disagree with the readiness score further down.
  const gap = gapAnalysis(DEMO_ORIGINAL.skills, DEMO_JOB.required_skills);
  const roleSkills = [
    ...gap.matched.map((name) => ({ name, matched: true })),
    ...gap.missing.map((name) => ({ name, matched: false })),
  ];

  return (
    <section className="relative pb-4">
      {/*
        Sparkles sit over the headline and are radially masked, so they read
        as light around the type rather than as a starfield behind the whole
        page. The global Ambience already supplies depth; stacking a second
        full-bleed effect on top of it would be noise, not atmosphere.
      */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-x-8 -top-12 h-[380px] [mask-image:radial-gradient(ellipse_45%_55%_at_28%_42%,black,transparent)]"
      >
        <SparklesCore
          minSize={0.4}
          maxSize={1.1}
          speed={0.7}
          particleDensity={38}
          particleColor="#46A88A"
          className="opacity-50"
        />
      </div>

      <div className="relative z-10 grid items-center gap-12 lg:grid-cols-[minmax(0,55fr)_minmax(0,45fr)] lg:gap-14">
        <div>
          <div
            className="eyebrow mb-6 inline-flex animate-rise-in items-center gap-2 rounded-sm bg-accent-soft px-3 py-1.5 text-accent"
            style={{ animationDelay: "0ms" }}
          >
            <ShieldCheck size={12} />
            Truthful by design
          </div>

          {/*
            One weight, so hierarchy comes from size and colour. The italic is
            the family's finest cut, spent on the phrase carrying the whole
            argument — and spent on the promise rather than on the warning,
            because emerald means "verified" everywhere else in this interface
            and should not be lent to the word "invented".
          */}
          <h1
            className="mb-6 animate-rise-in font-display text-[clamp(2.4rem,5.2vw,3.6rem)] leading-[1.06] tracking-display"
            style={{ animationDelay: "60ms" }}
          >
            Your resume,
            <br />
            <span className="italic text-accent">tailored to the job.</span>
            <span className="mt-2 block text-ink-soft">Never invented.</span>
          </h1>

          <p
            className="mb-9 max-w-md animate-rise-in text-[15px] leading-[1.75] text-ink-soft"
            style={{ animationDelay: "120ms" }}
          >
            Match the language of the role while your experience, dates and
            accomplishments stay exactly as your original resume stated them.
            Every change is listed, sourced, and checkable.
          </p>

          <div
            className="mb-7 flex animate-rise-in flex-col items-start gap-x-7 gap-y-4 sm:flex-row sm:items-center"
            style={{ animationDelay: "180ms" }}
          >
            <Link
              href={signedIn ? "#tailor" : "/login"}
              className="group inline-flex items-center gap-2 rounded bg-accent px-6 py-3 text-sm font-medium text-paper transition-colors hover:bg-accent-bright"
            >
              Start tailoring
              <ArrowRight
                size={15}
                className="transition-transform group-hover:translate-x-0.5"
                aria-hidden
              />
            </Link>

            {/* Not a plain jump link: it restarts the rewrite on arrival, so
                the label keeps its promise on the second press as well as the
                first. */}
            <ReplayLink
              targetId="how"
              scene={REWRITE_SCENE}
              className="group inline-flex items-center gap-1.5 text-sm text-ink-soft transition-colors hover:text-accent"
            >
              See a line get rewritten
              <ArrowDown
                size={14}
                className="transition-transform group-hover:translate-y-0.5"
                aria-hidden
              />
            </ReplayLink>
          </div>

          <p
            className="animate-rise-in font-mono text-[11px] leading-relaxed text-ink-soft"
            style={{ animationDelay: "240ms" }}
          >
            No invented experience · ATS scored · Fact-checked by a second
            model
          </p>
        </div>

        <MatchPreview
          yourTitle={DEMO_ORIGINAL.experience[0].title}
          yourSkills={DEMO_ORIGINAL.skills}
          roleTitle={DEMO_JOB.role}
          roleSkills={roleSkills}
        />
      </div>
    </section>
  );
}
