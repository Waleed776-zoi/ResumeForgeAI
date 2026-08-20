"use client";

import { Check, X } from "lucide-react";
import { useRevealOnScroll } from "@/lib/use-reveal";

/**
 * The product in one card: a resume on top, a role underneath, and an honest
 * account of the distance between them.
 *
 * The temptation with a hero visual is to show a perfect match — five skills
 * in, five green ticks out. That would be a lie about what the tool does, and
 * a boring one: any resume rewriter can claim a perfect fit if it is willing
 * to make things up. The two red gaps are the actual product. They are the
 * thing a competitor's output would have quietly filled in for you.
 *
 * Chips reuse the exact colours and icons of GapAnalysisPanel, so what you
 * see here is what the real report looks like rather than a marketing
 * approximation of it.
 */

const YOUR_TITLE = "Software Engineer";
const YOUR_SKILLS = ["Python", "React", "AWS", "Docker", "SQL"];

const ROLE_TITLE = "Machine Learning Engineer";
const ROLE_SKILLS: Array<{ name: string; matched: boolean }> = [
  { name: "Python", matched: true },
  { name: "Docker", matched: true },
  { name: "AWS", matched: true },
  { name: "PyTorch", matched: false },
  { name: "MLOps", matched: false },
];

const MATCHED = ROLE_SKILLS.filter((s) => s.matched).length;
const GAPS = ROLE_SKILLS.length - MATCHED;

/* Timing, in ms. The card should have finished settling before a reader who
   scrolled straight past it would have noticed it was moving. */
const YOURS_AT = 260;
const RULE_AT = 620;
const ROLE_AT = 820;
const STEP = 70;

function Chip({
  name,
  tone,
  delay,
}: {
  name: string;
  tone: "source" | "matched" | "gap";
  delay: number;
}) {
  const style = {
    source: "bg-raised text-ink-soft",
    matched: "bg-accent-soft text-accent",
    gap: "bg-flag/10 text-flag",
  }[tone];

  return (
    <span
      className={`inline-flex animate-chain-in items-center gap-1.5 rounded-sm px-2.5 py-1 font-mono text-[11px] ${style}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      {tone === "matched" && <Check size={11} aria-hidden />}
      {tone === "gap" && <X size={11} aria-hidden />}
      {name}
    </span>
  );
}

export function MatchPreview() {
  const ref = useRevealOnScroll<HTMLDivElement>();

  return (
    <div
      ref={ref}
      className="panel mx-auto max-w-md overflow-hidden p-6 text-left sm:p-7"
    >
      <p className="eyebrow mb-2.5 text-ink-soft">Your resume</p>
      <p
        className="mb-3.5 animate-chain-in text-[15px] text-ink"
        style={{ animationDelay: `${YOURS_AT}ms` }}
      >
        {YOUR_TITLE}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {YOUR_SKILLS.map((name, i) => (
          <Chip
            key={name}
            name={name}
            tone="source"
            delay={YOURS_AT + 80 + i * STEP}
          />
        ))}
      </div>

      {/* The transformation, drawn rather than labelled with an arrow. */}
      <div className="my-6 ml-px h-8 w-px rounded-full bg-line">
        <span
          aria-hidden
          className="block h-full w-full origin-top animate-draw-down bg-accent"
          style={{ animationDelay: `${RULE_AT}ms` }}
        />
      </div>

      <p className="eyebrow mb-2.5 text-accent">The role</p>
      <p
        className="mb-3.5 animate-chain-in text-[15px] text-ink"
        style={{ animationDelay: `${ROLE_AT}ms` }}
      >
        {ROLE_TITLE}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {ROLE_SKILLS.map((skill, i) => (
          <Chip
            key={skill.name}
            name={skill.name}
            tone={skill.matched ? "matched" : "gap"}
            delay={ROLE_AT + 80 + i * STEP}
          />
        ))}
      </div>

      <p
        className="mt-6 animate-chain-in border-t border-line pt-4 text-[12.5px] leading-relaxed text-ink-soft"
        style={{ animationDelay: `${ROLE_AT + 80 + ROLE_SKILLS.length * STEP}ms` }}
      >
        <span className="font-mono text-ink">
          {MATCHED} of {ROLE_SKILLS.length}
        </span>{" "}
        core skills are already in your resume.{" "}
        <span className="text-flag">{GAPS} are not</span> — so they are
        reported as gaps, never written in for you.
      </p>
    </div>
  );
}
