"use client";

import { Check, X } from "lucide-react";
import { useRevealOnScroll } from "@/lib/use-reveal";

/**
 * The closing argument: what this does, and what it refuses to do.
 *
 * Two improvisations on the brief.
 *
 * First, the heading does not say "AI". The whole point of the section is
 * that the boundary is the product; leading with the technology would spend
 * the strongest copy on the page describing the machinery, which is the exact
 * habit the rest of this interface just finished unlearning.
 *
 * Second — and this is what separates it from a features grid — every line in
 * the right-hand column carries the check that enforces it. A list of things
 * a product promises not to do is worth nothing; a list of things it actively
 * looks for after the fact is a specification. The captions are deliberately
 * written as detection rather than prevention, because that is what the code
 * does: buildChangeLedger diffs employers, titles and dates against the
 * original and traces every figure back to it. Claiming fabrication is
 * *impossible* would be the same species of overclaim this section exists to
 * refuse.
 */

type Line = { text: string; detail: string };

const CAN: Line[] = [
  {
    text: "Rephrase existing work",
    detail: "The same facts, in the language the posting uses",
  },
  {
    text: "Match job-specific language",
    detail: "Borrowed terms are highlighted, so you can see what moved",
  },
  {
    text: "Surface relevant skills",
    detail: "Lifts what's buried in a bullet up to where a screener looks",
  },
  {
    text: "Improve structure",
    detail: "Headings, dates and ordering that parsers can actually read",
  },
];

const WONT: Line[] = [
  {
    text: "Invent employers",
    detail: "Employer and title are diffed against your original",
  },
  {
    text: "Create achievements",
    detail: "Every figure has to trace back to the file you uploaded",
  },
  {
    text: "Change dates",
    detail: "Date strings are compared literally, never regenerated",
  },
  {
    text: "Add skills you don't have",
    detail: "An unclaimed skill is reported as a gap instead",
  },
];

function Column({
  heading,
  lines,
  tone,
  from,
}: {
  heading: string;
  lines: Line[];
  tone: "can" | "wont";
  from: number;
}) {
  const can = tone === "can";

  return (
    <div className="panel p-6 sm:p-7">
      <p className={`eyebrow mb-5 ${can ? "text-accent" : "text-ink-soft"}`}>
        {heading}
      </p>

      <ul className="space-y-4">
        {lines.map((line, i) => (
          <li
            key={line.text}
            className="flex animate-chain-in gap-3"
            style={{ animationDelay: `${from + i * 90}ms` }}
          >
            <span
              className={`mt-0.5 shrink-0 ${can ? "text-accent" : "text-flag"}`}
              aria-hidden
            >
              {can ? <Check size={15} /> : <X size={15} />}
            </span>
            <span>
              <span className="block text-[15px] leading-snug text-ink">
                {line.text}
              </span>
              <span className="mt-1 block font-mono text-[11px] leading-relaxed text-ink-soft">
                {line.detail}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Boundaries() {
  const ref = useRevealOnScroll<HTMLDivElement>({ threshold: 0.15 });

  return (
    <div ref={ref}>
      <p className="eyebrow mb-3 text-ink-soft">Where the line is</p>

      <h2 className="mb-10 max-w-2xl font-display text-[clamp(1.9rem,3.8vw,2.6rem)] leading-[1.12] tracking-display">
        Tailoring should make your experience clearer.
        <span className="mt-1 block text-ink-soft">
          Not make new experience up.
        </span>
      </h2>

      <div className="grid gap-5 md:grid-cols-2">
        <Column
          heading="ResumeForge can"
          lines={CAN}
          tone="can"
          from={120}
        />
        <Column
          heading="ResumeForge won't"
          lines={WONT}
          tone="wont"
          from={300}
        />
      </div>

      <p className="mt-6 max-w-2xl text-[13px] leading-relaxed text-ink-soft">
        The right-hand column is not a promise — it is four checks that run{" "}
        <span className="text-ink">after</span> the rewrite. Anything that
        fails one of them arrives on your results page marked for review,
        rather than reaching an employer unnoticed.
      </p>
    </div>
  );
}
