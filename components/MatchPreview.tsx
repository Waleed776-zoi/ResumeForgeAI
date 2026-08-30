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

export type RoleSkill = { name: string; matched: boolean };

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

export function MatchPreview({
  yourTitle,
  yourSkills,
  roleTitle,
  roleSkills,
}: {
  yourTitle: string;
  yourSkills: string[];
  roleTitle: string;
  roleSkills: RoleSkill[];
}) {
  const ref = useRevealOnScroll<HTMLDivElement>();

  const matched = roleSkills.filter((s) => s.matched).length;
  const gaps = roleSkills.length - matched;

  return (
    <div
      ref={ref}
      className="panel mx-auto w-full max-w-md overflow-hidden p-6 text-left sm:p-7 lg:mx-0 lg:ml-auto"
    >
      <p className="eyebrow mb-2.5 text-ink-soft">Your resume</p>
      <p
        className="mb-3.5 animate-chain-in text-[15px] text-ink"
        style={{ animationDelay: `${YOURS_AT}ms` }}
      >
        {yourTitle}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {yourSkills.map((name, i) => (
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
        {roleTitle}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {roleSkills.map((skill, i) => (
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
        style={{ animationDelay: `${ROLE_AT + 80 + roleSkills.length * STEP}ms` }}
      >
        <span className="font-mono text-ink">
          {matched} of {roleSkills.length}
        </span>{" "}
        core skills are already in your resume.{" "}
        <span className="text-flag">
          {gaps} {gaps === 1 ? "is" : "are"} not
        </span> — so they are
        reported as gaps, never written in for you.
      </p>
    </div>
  );
}
