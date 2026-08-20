import { ShieldCheck } from "lucide-react";
import { SparklesCore } from "@/components/ui/sparkles";

/**
 * The hero IS the product.
 *
 * A headline saying "tailor your resume" describes the thing; showing a real
 * bullet being reworked demonstrates it, and demonstrates the constraint that
 * makes it worth trusting — every accented phrase below is language lifted
 * from the job posting, and every fact is one the original already stated.
 *
 * The example is deliberately unglamorous and checkable: same employer, same
 * dates, same numbers, same work. Nothing is added. A hero that quietly
 * invented an achievement would undercut the one promise this app makes.
 *
 * Motion is a single staged reveal that runs once on load, and the global
 * prefers-reduced-motion rule strips it — the layout reads identically
 * without it.
 */

const BEFORE =
  "Worked on a medical imaging project. Built the backend and helped get it running in the hospital.";

/** Split so borrowed job-posting language can be marked without markup soup. */
const AFTER: Array<{ text: string; borrowed?: boolean }> = [
  { text: "Built and " },
  { text: "deployed a deep learning", borrowed: true },
  { text: " medical imaging system to production, cutting " },
  { text: "inference latency", borrowed: true },
  { text: " to ~1.2 s per image." },
];

function Panel({
  label,
  tone,
  children,
  delay,
}: {
  label: string;
  tone: "before" | "after";
  children: React.ReactNode;
  delay: string;
}) {
  const after = tone === "after";

  return (
    <div
      className={`flex-1 rounded-lg p-6 animate-rise-in ${
        after
          ? "border border-accent/25 bg-accent-soft/60"
          : "border border-line bg-surface/50"
      }`}
      style={{ animationDelay: delay }}
    >
      <p className={`eyebrow mb-3.5 ${after ? "text-accent" : "text-ink-soft"}`}>
        {label}
      </p>
      <p
        className={`text-[15px] leading-[1.7] ${
          after ? "text-ink" : "text-ink-soft"
        }`}
      >
        {children}
      </p>
    </div>
  );
}

export function TransformationHero() {
  return (
    <section className="relative mb-16">
      {/*
        Sparkles are confined to the headline block and radially masked, so
        they read as light around the type rather than as a starfield behind
        the whole page. The global Ambience already supplies depth; stacking a
        second full-bleed effect on top of it would be noise, not atmosphere.
      */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-x-8 -top-10 h-[340px] [mask-image:radial-gradient(ellipse_60%_60%_at_30%_40%,black,transparent)]"
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

      <div
        className="relative z-10 inline-flex items-center gap-2 text-accent eyebrow mb-7 animate-rise-in"
        style={{ animationDelay: "0ms" }}
      >
        <ShieldCheck size={13} />
        Truthful by design
      </div>

      {/*
        One weight, so hierarchy comes from size and colour. The italic is
        the family's finest cut, spent on the single phrase that carries the
        product's whole argument.
      */}
      <h1
        className="relative z-10 font-display text-[clamp(2.6rem,7vw,4.4rem)] leading-[1.02] tracking-display mb-6 animate-rise-in"
        style={{ animationDelay: "60ms" }}
      >
        Your experience,
        <br />
        <span className="italic text-accent">rewritten</span>
        <span className="text-ink-soft"> — never invented.</span>
      </h1>

      <p
        className="relative z-10 text-ink-soft text-[15px] leading-[1.75] max-w-lg mb-11 animate-rise-in"
        style={{ animationDelay: "120ms" }}
      >
        Every highlighted phrase below is language borrowed from the job
        posting. The facts underneath are the ones your resume already stated —
        checked by a second model before you ever see them.
      </p>

      <div className="relative z-10 flex flex-col lg:flex-row items-stretch gap-4">
        <Panel label="What you wrote" tone="before" delay="220ms">
          {BEFORE}
        </Panel>

        {/* A hairline that fills toward the result: the transformation drawn
            rather than labelled. */}
        <div
          className="flex lg:flex-col items-center justify-center animate-rise-in"
          style={{ animationDelay: "340ms" }}
        >
          <span className="relative block h-px w-10 lg:h-14 lg:w-px bg-line overflow-hidden rounded-full">
            <span className="absolute inset-0 bg-accent origin-left lg:origin-top animate-draw-underline lg:[transform:scaleY(0)] lg:animate-[draw-down_0.6s_cubic-bezier(0.2,0.7,0.3,1)_both]" />
          </span>
        </div>

        <Panel label="Tailored — ML Engineer" tone="after" delay="440ms">
          {AFTER.map((part, i) =>
            part.borrowed ? (
              <span key={i} className="relative text-accent">
                {part.text}
                <span
                  className="absolute left-0 -bottom-0.5 h-px w-full bg-accent/70 origin-left animate-draw-underline"
                  style={{ animationDelay: `${680 + i * 90}ms` }}
                />
              </span>
            ) : (
              <span key={i}>{part.text}</span>
            )
          )}
        </Panel>
      </div>

      <p
        className="font-mono text-[11px] leading-relaxed text-ink-soft mt-5 animate-rise-in"
        style={{ animationDelay: "760ms" }}
      >
        Same employer · same dates · same 1.2 s
      </p>
    </section>
  );
}
