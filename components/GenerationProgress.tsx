"use client";

import { Check, Loader2 } from "lucide-react";
import { GENERATION_STAGES, stageIndex, type StageId } from "@/lib/stages";

/**
 * Shows where the work actually is, driven by events the server sends as each
 * step completes — not a timer guessing on its behalf. The steps are named
 * after what the product does for you ("Fact-checking every claim") because a
 * 20-second wait is the one moment someone is paying full attention to how
 * the thing works, and it should teach them the product rather than the
 * stack.
 *
 * `model` no longer appears in the copy. It used to read "Currently
 * answering: GPT-OSS 20B (Groq)", which was the loudest piece of machinery
 * anywhere in the interface and sat in the one place with a captive audience.
 * The substitution is still worth being able to see — it just belongs to
 * whoever is debugging, so it rides along as a data attribute that devtools
 * shows and no reader ever does.
 */
export function GenerationProgress({
  current,
  model,
}: {
  current: StageId;
  model?: string;
}) {
  const currentIndex = stageIndex(current);
  const total = GENERATION_STAGES.length;
  // Count the in-flight step as half done, so the bar always moves on the
  // long stages instead of sitting still for eight seconds.
  const fraction = (currentIndex + 0.5) / total;

  return (
    <div
      className="panel overflow-hidden"
      role="status"
      aria-live="polite"
      data-model={model || undefined}
    >
      <div className="h-1 bg-line">
        <div
          className="h-full bg-accent transition-all duration-700 ease-out"
          style={{ width: `${Math.round(fraction * 100)}%` }}
        />
      </div>

      <ol className="p-6 space-y-3">
        {GENERATION_STAGES.map((stage, i) => {
          const done = i < currentIndex;
          const active = i === currentIndex;

          return (
            <li
              key={stage.id}
              className={`flex items-center gap-3 text-sm transition-opacity duration-300 ${
                active
                  ? "text-ink font-medium"
                  : done
                    ? "text-ink-soft"
                    : "text-ink-soft/40"
              }`}
            >
              <span className="w-4 h-4 flex items-center justify-center shrink-0">
                {done && <Check size={14} className="text-accent" />}
                {active && (
                  <Loader2 size={14} className="animate-spin text-accent" />
                )}
                {!done && !active && (
                  <span className="w-1.5 h-1.5 rounded-full bg-current" />
                )}
              </span>
              {stage.label}
            </li>
          );
        })}
      </ol>

      <p className="px-6 pb-5 text-xs text-ink-soft/80">
        This usually takes 15–25 seconds — leave this tab open. Nothing is
        written into your resume that isn't already in the file you uploaded.
      </p>
    </div>
  );
}
