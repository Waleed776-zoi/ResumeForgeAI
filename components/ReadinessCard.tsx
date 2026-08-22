"use client";

import { RotateCcw } from "lucide-react";
import { useInView, useElapsed } from "@/lib/use-in-view";
import { useSceneReplay } from "@/lib/use-scene-replay";
import { READINESS_SCENE } from "@/lib/scene-replay";
import { progressAt, countTo, fractionTo } from "@/lib/animate";
import type { AtsReport, CheckStatus } from "@/lib/ats";

/**
 * The readiness audit, computed on screen.
 *
 * Takes a real AtsReport rather than a shape of its own, so it cannot drift
 * from what the results page shows — it is the same object, rendered leaner.
 *
 * THE ORDER IS THE ARGUMENT. Each check counts up in turn, and only when the
 * last one has landed does the total climb from zero. That is the actual
 * dependency: the score is not a verdict handed down and then justified, it
 * is the sum of eight things that were measured first. An animation that
 * stamped 86 on the page and then filled the rows underneath would be telling
 * the opposite story, in the section whose entire claim is that the number
 * is derived rather than asserted.
 *
 * Until the total starts, its slot holds an em dash rather than a zero. A
 * zero sitting there for two seconds reads as a failed resume; a dash reads
 * as a pending measurement, which is what it is.
 *
 * One rAF clock drives everything (see useElapsed) and every value is a pure
 * function of it, so nothing can drift out of step or finish short.
 */

const FILL: Record<CheckStatus, string> = {
  pass: "bg-accent",
  warn: "bg-flag/70",
  fail: "bg-flag",
  skipped: "bg-ink-soft/30",
};

/* Timing, in ms. Slow enough to read as counting, quick enough that the
   total is on screen well before anyone would go looking for it. */
const ROWS_AT = 140;
const ROW_STEP = 130;
const ROW_DUR = 620;
const HANDOVER = 260;
const SCORE_DUR = 900;

export function ReadinessCard({ report }: { report: AtsReport }) {
  const { run, replay } = useSceneReplay(READINESS_SCENE);
  // A third of the card has to be on screen before it starts, and it re-arms
  // once it has scrolled fully away — so the count is something the reader
  // watches happen rather than something they arrive after.
  const { ref, phase } = useInView<HTMLDivElement>({
    enter: 0.35,
    retrigger: true,
    replayKey: run,
  });

  const rowsEnd = ROWS_AT + (report.checks.length - 1) * ROW_STEP + ROW_DUR;
  const scoreAt = rowsEnd + HANDOVER;
  const total = scoreAt + SCORE_DUR;

  const elapsed = useElapsed(phase, total);

  const scoreProgress = progressAt(elapsed, scoreAt, SCORE_DUR);
  const scoreStarted = elapsed >= scoreAt;
  const score = countTo(report.score, scoreProgress);
  const weak = report.band === "needs work";

  return (
    <div ref={ref} className="panel p-6 sm:p-7">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <p className="eyebrow mb-3 text-ink-soft">Resume readiness</p>
          <p className="flex items-baseline gap-1.5">
            <span
              className={`font-mono text-[3.25rem] leading-none tabular-nums transition-colors duration-500 ${
                !scoreStarted
                  ? "text-ink-soft/40"
                  : weak
                    ? "text-flag"
                    : "text-accent"
              }`}
            >
              {scoreStarted ? score : "—"}
            </span>
            <span className="font-mono text-lg text-ink-soft">/ 100</span>
          </p>
        </div>

        {/* The band is a reading of the total, so it arrives with it. */}
        <span
          className="eyebrow rounded-sm bg-raised px-2.5 py-1 text-ink-soft transition-opacity duration-500"
          style={{ opacity: scoreProgress > 0.75 ? 1 : 0 }}
        >
          {report.band}
        </span>
      </div>

      <div className="mb-7 h-1 overflow-hidden rounded-full bg-line">
        <div
          className={`h-full rounded-full ${weak ? "bg-flag" : "bg-accent"}`}
          style={{ width: `${fractionTo(report.score, scoreProgress)}%` }}
        />
      </div>

      <ul className="space-y-3.5">
        {report.checks.map((check, i) => {
          const skipped = check.status === "skipped";
          const target = skipped
            ? 0
            : Math.round((check.earned / check.weight) * 100);

          const progress = progressAt(
            elapsed,
            ROWS_AT + i * ROW_STEP,
            ROW_DUR
          );
          const counted = countTo(target, progress);

          return (
            <li key={check.id}>
              <div className="mb-1.5 flex items-baseline justify-between gap-4">
                <span
                  className={`text-[13px] leading-snug transition-opacity duration-300 ${
                    skipped ? "text-ink-soft/60" : "text-ink"
                  }`}
                  style={{ opacity: progress > 0 ? 1 : 0.35 }}
                >
                  {check.label}
                </span>
                <span
                  className={`shrink-0 font-mono text-[13px] tabular-nums ${
                    skipped
                      ? "text-ink-soft/50"
                      : check.status === "pass"
                        ? "text-accent"
                        : "text-flag"
                  }`}
                >
                  {skipped ? "—" : counted}
                </span>
              </div>

              <div className="h-px overflow-hidden bg-line">
                <div
                  className={`h-full ${FILL[check.status]}`}
                  style={{ width: `${fractionTo(target, progress)}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>

      {/* The weights are the audit's own argument: a reader who disagrees
          with the total can see exactly which check bought it. */}
      <div className="mt-6 flex items-baseline justify-between gap-4 border-t border-line pt-4">
        <p
          className="font-mono text-[10.5px] leading-relaxed text-ink-soft transition-opacity duration-500"
          style={{ opacity: scoreProgress > 0.75 ? 1 : 0 }}
        >
          {report.earned.toFixed(0)} of {report.available} points across{" "}
          {report.checks.filter((c) => c.status !== "skipped").length} weighted
          checks
        </p>

        <button
          type="button"
          onClick={replay}
          className="inline-flex shrink-0 items-center gap-1.5 font-mono text-[10.5px] text-ink-soft transition-colors hover:text-accent"
        >
          <RotateCcw size={11} aria-hidden />
          Replay
        </button>
      </div>
    </div>
  );
}
