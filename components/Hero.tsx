import Link from "next/link";
import { ArrowRight, ArrowDown, ShieldCheck } from "lucide-react";
import { SparklesCore } from "@/components/ui/sparkles";
import { MatchPreview } from "@/components/MatchPreview";

/**
 * First viewport: the promise, the action, and the proof — in that order,
 * with nothing below the fold that a visitor needs in order to decide.
 *
 * The previous hero opened with a full line-level rewrite. It was the better
 * *demonstration* and the worse *entrance*: it asked for twenty seconds of
 * attention before offering anything to click, and it explained the mechanism
 * to someone who had not yet been told what the mechanism was for. The rewrite
 * still exists — it just runs one screen down, where a reader has already
 * decided they care how it works.
 *
 * No wordmark here. The sketch this came from put "RESUMEFORGE" above the
 * eyebrow, but the sticky header carries it eight pixels higher on the same
 * screen; printing it twice reads as a page that lost its place.
 */
export function Hero({ signedIn }: { signedIn: boolean }) {
  return (
    <section className="relative pb-4 text-center">
      {/*
        Sparkles are confined to the headline block and radially masked, so
        they read as light around the type rather than as a starfield behind
        the whole page. The global Ambience already supplies depth; stacking a
        second full-bleed effect on top of it would be noise, not atmosphere.
      */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-x-8 -top-12 h-[360px] [mask-image:radial-gradient(ellipse_55%_60%_at_50%_38%,black,transparent)]"
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

      <div className="relative z-10 mx-auto max-w-2xl">
        <div
          className="eyebrow mb-6 inline-flex animate-rise-in items-center gap-2 rounded-sm bg-accent-soft px-3 py-1.5 text-accent"
          style={{ animationDelay: "0ms" }}
        >
          <ShieldCheck size={12} />
          Truthful by design
        </div>

        {/*
          One weight, so hierarchy comes from size and colour. The italic is
          the family's finest cut, spent on the single phrase that carries the
          product's whole argument — and spent on the promise rather than on
          the warning, because emerald means "verified" everywhere else in
          this interface and should not be lent to the word "lie".
        */}
        <h1
          className="mb-6 animate-rise-in font-display text-[clamp(2.4rem,6.2vw,3.9rem)] leading-[1.06] tracking-display"
          style={{ animationDelay: "60ms" }}
        >
          Your resume,{" "}
          <span className="italic text-accent">tailored to the job</span>
          <br />
          <span className="text-ink-soft">— not rewritten into a lie.</span>
        </h1>

        <p
          className="mx-auto mb-9 max-w-lg animate-rise-in text-[15px] leading-[1.75] text-ink-soft"
          style={{ animationDelay: "120ms" }}
        >
          Match the language of the role while your experience, dates and
          accomplishments stay exactly as your original resume stated them.
          Every change is listed, sourced, and checkable.
        </p>

        <div
          className="mb-6 flex animate-rise-in flex-col items-center justify-center gap-x-7 gap-y-3 sm:flex-row"
          style={{ animationDelay: "180ms" }}
        >
          <Link
            href={signedIn ? "#tailor" : "/login"}
            className="group inline-flex items-center gap-2 rounded bg-accent px-6 py-3 text-sm font-medium text-paper transition-colors hover:bg-accent-bright"
          >
            Tailor my resume
            <ArrowRight
              size={15}
              className="transition-transform group-hover:translate-x-0.5"
              aria-hidden
            />
          </Link>

          <Link
            href="#how"
            className="group inline-flex items-center gap-1.5 text-sm text-ink-soft transition-colors hover:text-accent"
          >
            See a line get rewritten
            <ArrowDown
              size={14}
              className="transition-transform group-hover:translate-y-0.5"
              aria-hidden
            />
          </Link>
        </div>

        <p
          className="mb-12 animate-rise-in font-mono text-[11px] text-ink-soft"
          style={{ animationDelay: "240ms" }}
        >
          No invented experience · ATS scored · Fact-checked by a second model
        </p>

        <MatchPreview />
      </div>
    </section>
  );
}
