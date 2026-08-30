"use client";

import { RotateCcw } from "lucide-react";
import { useRevealOnScroll } from "@/lib/use-reveal";
import { REWRITE_SCENE } from "@/lib/scene-replay";
import { useSceneReplay } from "@/lib/use-scene-replay";
import type { DemoSegment } from "@/lib/demo-application";

/**
 * The product's one claim, performed instead of stated.
 *
 * A vague line the reader has certainly written themselves is rewritten, word
 * by word, into the version a machine screener would score — and then the
 * scene stops and accounts for every phrase it added.
 *
 * Three decisions worth keeping:
 *
 * 1. The original does not fade out. A before/after that erases the "before"
 *    asks you to take the transformation on faith, which is the exact posture
 *    this app exists to refuse. Both lines stay on screen, permanently
 *    checkable, and the hierarchy comes from colour weight rather than from
 *    hiding one of them.
 *
 * 2. Every word arrives blurred and settles. That is the entire trick: fading
 *    a finished paragraph in reads as a slide transition, while focus pulling
 *    into place reads as writing.
 *
 * 3. The example cannot cheat. Every figure in the tailored line — the 1.2 s
 *    — is present in the original above it, and the provenance chain says so
 *    outright. A hero that quietly invented a metric would be a live
 *    demonstration of the failure mode the product claims to prevent.
 */

type Segment = DemoSegment;

/**
 * The sentence is chosen once per request by the page and handed down, rather
 * than imported here. That is what keeps the rotation coherent: a Client
 * Component picking its own example could not agree with the hero card or the
 * readiness score, and picking one during render would differ between the
 * server's HTML and the browser's hydration.
 */
export interface TransformationSceneProps {
  /** The candidate's own line, before tailoring. */
  original: string;
  /** The tailored line, split so borrowed phrases can be marked. */
  rewrite: Segment[];
  /** Named in the panel label, so the reader knows what it was tailored to. */
  roleTitle: string;
}

/*
 * Timing, in milliseconds. Slow enough that the rewrite is legible as it
 * happens; short enough that nobody is waiting on it. The whole sequence
 * lands at roughly 2.7 s.
 */
const RULE_AT = 240;
const WRITE_AT = 620;
const PER_WORD = 26;
const SETTLE_AFTER = 420;
const MARK_GAP = 300;

const countWords = (text: string) =>
  text.trim().split(/\s+/).filter(Boolean).length;

/**
 * When the highlight phase begins: after the last word has settled.
 *
 * Derived from the sentence rather than fixed, because the rotating examples
 * are not the same length — a constant tuned to one of them would start
 * marking a longer sentence while its final words were still arriving.
 */
const marksAt = (segments: Segment[]) =>
  WRITE_AT +
  segments.reduce((n, s) => n + countWords(s.text), 0) * PER_WORD +
  SETTLE_AFTER;

/**
 * Splits a run of text into per-word spans on a shared delay schedule, while
 * leaving the whitespace as real text nodes so the paragraph still wraps
 * exactly where it would have.
 */
function Words({ text, from }: { text: string; from: number }) {
  let index = from;

  return (
    <>
      {text.split(/(\s+)/).map((token, i) => {
        if (token === "" || /^\s+$/.test(token)) {
          return <span key={i}>{token}</span>;
        }
        const delay = WRITE_AT + index * PER_WORD;
        index += 1;
        return (
          <span
            key={i}
            className="inline-block animate-word-in"
            style={{ animationDelay: `${delay}ms` }}
          >
            {token}
          </span>
        );
      })}
    </>
  );
}

function TailoredLine({ segments }: { segments: Segment[] }) {
  const MARKS_AT = marksAt(segments);
  let cursor = 0;
  let markIndex = 0;

  return (
    <>
      {segments.map((segment, i) => {
        const from = cursor;
        cursor += countWords(segment.text);

        if (!segment.mark) {
          return <Words key={i} text={segment.text} from={from} />;
        }

        const at = MARKS_AT + markIndex * MARK_GAP;
        markIndex += 1;
        const posting = segment.mark === "posting";

        return (
          <span
            key={i}
            className={
              posting
                ? "relative animate-mark-posting"
                : "relative font-mono text-[0.93em]"
            }
            style={posting ? { animationDelay: `${at}ms` } : undefined}
          >
            <Words text={segment.text} from={from} />
            {/* Drawn, not faded: the underline is the act of marking. */}
            <span
              aria-hidden
              className={`absolute -bottom-0.5 left-0 h-px w-full origin-left animate-draw-underline ${
                posting ? "bg-current opacity-70" : "bg-ink-soft/60"
              }`}
              style={{ animationDelay: `${at}ms` }}
            />
          </span>
        );
      })}
    </>
  );
}

function ProvenanceChain({ segments }: { segments: Segment[] }) {
  const MARKS_AT = marksAt(segments);
  const marked = segments.filter((s) => s.mark);

  return (
    <ol className="mt-7">
      {marked.map((segment, i) => {
        const at = MARKS_AT + i * MARK_GAP;
        return (
          <li key={segment.text}>
            {i > 0 && (
              <span
                aria-hidden
                className="my-1.5 ml-[5px] block h-3.5 w-px origin-top animate-draw-down bg-line"
                style={{ animationDelay: `${at - 140}ms` }}
              />
            )}
            <span
              className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 animate-chain-in"
              style={{ animationDelay: `${at + 110}ms` }}
            >
              <span
                className={`font-mono text-[12px] ${
                  segment.mark === "posting" ? "text-accent" : "text-ink"
                }`}
              >
                {segment.text}
              </span>
              <span className="text-[11px] leading-relaxed text-ink-soft">
                {segment.note}
              </span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export function TransformationScene({
  original,
  rewrite,
  roleTitle,
}: TransformationSceneProps) {
  // Bumping `run` remounts the animated subtree, which is the whole of the
  // replay: the elements come back holding their 0% keyframes again. It is
  // bumped locally by the Replay button and remotely by any ReplayLink
  // pointing at this scene.
  const { run, replay } = useSceneReplay(REWRITE_SCENE);

  // Passing `run` re-arms the scroll hold. A replay triggered from the top of
  // the page therefore waits out the smooth scroll rather than playing to an
  // empty viewport; a replay triggered while the scene is already on screen
  // starts immediately.
  const ref = useRevealOnScroll<HTMLDivElement>({ replayKey: run });

  return (
    <div ref={ref}>
      <div
        key={run}
        className="rounded-lg border border-line bg-surface/50 p-6 lg:p-7"
      >
        <p className="eyebrow mb-3 text-ink-soft">What you wrote</p>
        <p className="text-[15px] leading-[1.7] text-ink-soft">{original}</p>

        {/* The transformation, drawn rather than labelled with an arrow. */}
        <div className="my-5 ml-px h-7 w-px rounded-full bg-line">
          <span
            aria-hidden
            className="block h-full w-full origin-top animate-draw-down bg-accent"
            style={{ animationDelay: `${RULE_AT}ms` }}
          />
        </div>

        <div className="relative pl-4">
          <span
            aria-hidden
            className="absolute left-0 top-0 h-full w-px origin-top animate-draw-down bg-accent/35"
            style={{ animationDelay: `${WRITE_AT}ms` }}
          />
          <p
            className="eyebrow mb-3 text-accent animate-chain-in"
            style={{ animationDelay: `${WRITE_AT - 140}ms` }}
          >
            Tailored — {roleTitle}
          </p>
          <p className="text-[15px] leading-[1.7] text-ink">
            <TailoredLine segments={rewrite} />
          </p>

          <ProvenanceChain segments={rewrite} />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
        {/* Reads the carried-over figure out of the sentence rather than
            naming one, so the claim stays true for every rotating example. */}
        <p className="font-mono text-[11px] leading-relaxed text-ink-soft">
          Same employer · same dates · same{" "}
          {rewrite.find((s) => s.mark === "kept")?.text ?? "figures"}
        </p>
        <button
          type="button"
          onClick={replay}
          className="inline-flex items-center gap-1.5 font-mono text-[11px] text-ink-soft transition-colors hover:text-accent"
        >
          <RotateCcw size={11} aria-hidden />
          Replay
        </button>
      </div>
    </div>
  );
}
