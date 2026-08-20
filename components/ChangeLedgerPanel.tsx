"use client";

import { useState } from "react";
import { Check, AlertTriangle, ArrowRight, Minus } from "lucide-react";
import { useRevealOnScroll } from "@/lib/use-reveal";
import type { ChangeLedger, LedgerEntry, ChangeKind } from "@/lib/change-ledger";

const KIND_LABEL: Record<ChangeKind, string> = {
  reworded: "Reworded",
  added: "Added",
  removed: "Removed",
  unchanged: "Unchanged",
};

/**
 * Marks the words lifted from the job posting, so "borrowed language" is
 * something the reader can see rather than something the app asserts.
 *
 * The underlines draw one at a time rather than arriving together: a row is
 * meant to be audited term by term, and the stagger is what makes the eye
 * stop on each one instead of reading past a block of green. `at` is the
 * row's own delay, so each row runs its own short sequence.
 */
function Highlighted({
  text,
  terms,
  at,
}: {
  text: string;
  terms: string[];
  at: number;
}) {
  if (terms.length === 0) return <>{text}</>;

  const escaped = terms
    .map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .sort((a, b) => b.length - a.length);
  const pattern = new RegExp(`\\b(${escaped.join("|")})\\b`, "gi");

  let marked = 0;

  return (
    <>
      {text.split(pattern).map((part, i) => {
        if (!terms.some((t) => t.toLowerCase() === part.toLowerCase())) {
          return <span key={i}>{part}</span>;
        }
        const delay = at + 260 + marked * 150;
        marked += 1;
        return (
          <mark key={i} className="relative bg-transparent text-accent">
            {part}
            <span
              aria-hidden
              className="absolute -bottom-0.5 left-0 h-px w-full origin-left animate-draw-underline bg-current opacity-60"
              style={{ animationDelay: `${delay}ms` }}
            />
          </mark>
        );
      })}
    </>
  );
}

function Row({ entry, index }: { entry: LedgerEntry; index: number }) {
  const review = entry.verdict === "review";
  // Capped so a forty-change ledger does not leave the last rows waiting two
  // seconds for a stagger nobody is still watching.
  const at = Math.min(index, 8) * 55;

  return (
    <li
      className={`relative animate-lift-in rounded-lg border p-5 transition-colors ${
        review ? "border-flag/40 bg-flag/[0.04]" : "border-line bg-surface/40"
      }`}
      style={{ animationDelay: `${at}ms` }}
    >
      <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="font-mono text-[11px] tabular-nums text-ink-soft">
          {String(index + 1).padStart(2, "0")}
        </span>
        <span
          className={`eyebrow ${review ? "text-flag" : "text-accent"}`}
        >
          {KIND_LABEL[entry.kind]}
        </span>
        <span className="truncate text-xs text-ink-soft">{entry.section}</span>

        <span
          className={`ml-auto inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-eyebrow ${
            review ? "text-flag" : "text-accent"
          }`}
        >
          {review ? <AlertTriangle size={12} /> : <Check size={12} />}
          {review ? "Needs review" : "Supported"}
        </span>
      </div>

      <div className="space-y-3 text-sm leading-relaxed">
        {entry.original && (
          <div>
            <p className="eyebrow mb-1.5 text-ink-soft">Original</p>
            <p className="text-ink-soft">{entry.original}</p>
          </div>
        )}

        {entry.original && entry.tailored && (
          <ArrowRight size={13} className="text-ink-soft/50" aria-hidden />
        )}

        {entry.tailored && (
          <div>
            <p className="eyebrow mb-1.5 text-ink-soft">Tailored</p>
            <p className="text-ink">
              <Highlighted text={entry.tailored} terms={entry.borrowed} at={at} />
            </p>
          </div>
        )}
      </div>

      <dl className="mt-4 space-y-1.5 border-t border-line pt-3.5 text-xs">
        <div className="flex gap-2">
          <dt className="shrink-0 text-ink-soft/70">Why</dt>
          <dd className="text-ink-soft">{entry.why}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="shrink-0 text-ink-soft/70">Source</dt>
          <dd className="text-ink-soft">{entry.source}</dd>
        </div>
        {entry.unsupported.length > 0 && (
          <div className="flex gap-2">
            <dt className="shrink-0 text-flag/80">Untraceable</dt>
            <dd className="font-mono text-flag">
              {entry.unsupported.join(", ")}
            </dd>
          </div>
        )}
      </dl>
    </li>
  );
}

export function ChangeLedgerPanel({ ledger }: { ledger: ChangeLedger }) {
  const [showUnchanged, setShowUnchanged] = useState(false);
  // The ledger sits well below the fold, so the rows wait for the reader
  // instead of having played out unseen before they get here.
  const listRef = useRevealOnScroll<HTMLOListElement>({ threshold: 0.05 });

  const { stats } = ledger;
  // Anything needing review comes first — the point of the ledger is to find
  // those quickly, not to read it front to back.
  const ordered = [...ledger.entries].sort((a, b) => {
    if (a.verdict !== b.verdict) return a.verdict === "review" ? -1 : 1;
    return 0;
  });
  const visible = showUnchanged
    ? ordered
    : ordered.filter((e) => e.kind !== "unchanged");
  const hidden = ordered.length - visible.length;

  return (
    <section className="panel p-7">
      <div className="mb-1.5 flex items-baseline justify-between gap-4">
        <h3 className="font-display text-[22px]">Change ledger</h3>
        <span
          className={`font-mono text-2xl tabular-nums ${
            stats.needsReview > 0 ? "text-flag" : "text-accent"
          }`}
        >
          {stats.needsReview > 0 ? stats.needsReview : stats.total}
        </span>
      </div>

      <p className="mb-5 text-xs leading-relaxed text-ink-soft">
        Every edit between your resume and the tailored version, diffed in code
        rather than described by a model — a model that invented something
        would happily explain why it belonged. A line is{" "}
        <span className="text-accent">supported</span> when every figure and
        named skill in it also appears in your original. It flags facts and
        skills, not turns of phrase, which is why the fact-check above still
        runs alongside it.
      </p>

      {!ledger.factsPreserved && (
        <div className="mb-5 rounded-lg border border-flag/50 bg-flag/[0.06] p-4">
          <p className="mb-2 inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-eyebrow text-flag">
            <AlertTriangle size={12} />
            Employment facts were altered
          </p>
          <ul className="list-inside list-disc space-y-1 text-sm text-ink-soft">
            {ledger.alteredFacts.map((fact) => (
              <li key={fact}>{fact}</li>
            ))}
          </ul>
        </div>
      )}

      <dl className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["Reworded", stats.reworded],
          ["Added", stats.added],
          ["Removed", stats.removed],
          ["Untouched", stats.unchanged],
        ].map(([label, value]) => (
          <div key={label as string} className="rounded-lg bg-raised/60 px-3 py-2.5">
            <dt className="eyebrow text-ink-soft">{label}</dt>
            <dd className="mt-1 font-mono text-lg tabular-nums text-ink">
              {value}
            </dd>
          </div>
        ))}
      </dl>

      {visible.length === 0 ? (
        <p className="text-sm text-ink-soft">
          Nothing was changed — the tailored version matches your resume
          word for word.
        </p>
      ) : (
        <ol ref={listRef} className="space-y-3">
          {visible.map((entry, i) => (
            <Row key={entry.id} entry={entry} index={i} />
          ))}
        </ol>
      )}

      {hidden > 0 && (
        <button
          type="button"
          onClick={() => setShowUnchanged(true)}
          className="mt-4 inline-flex items-center gap-1.5 text-xs text-ink-soft transition-colors hover:text-accent"
        >
          <Minus size={12} />
          Show {hidden} line{hidden === 1 ? "" : "s"} carried over unchanged
        </button>
      )}
    </section>
  );
}
