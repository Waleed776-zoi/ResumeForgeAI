import { ShieldCheck, ShieldAlert } from "lucide-react";

/**
 * The signature element: a verification stamp, not a generic "AI-generated"
 * disclaimer. It's the one visual promise the whole pipeline exists to keep,
 * so it gets a deliberate, struck-into-the-page treatment.
 *
 * This is where the deep emerald is spent. It's the one element that gets a
 * FILLED accent rather than a tinted one — everything else in the interface
 * outlines or tints, so a solid block of colour reads as a stamp pressed onto
 * the page. That weight is the whole point: it should feel like something was
 * certified, not like a status chip.
 *
 * The label is set in mono on purpose: it reports a machine's verdict, and it
 * should look like one rather than like prose the marketing team wrote.
 */
export function IntegrityBadge({
  passed,
  flaggedItems,
}: {
  passed: boolean;
  flaggedItems: string[];
}) {
  if (passed) {
    return (
      <div className="inline-flex items-center gap-2.5 bg-accent-deep text-ink px-4 py-2.5 rounded-sm ring-1 ring-inset ring-accent/30">
        <ShieldCheck size={17} className="shrink-0" />
        <span className="font-mono text-xs tracking-wider uppercase">
          Verified — no fabricated information
        </span>
      </div>
    );
  }

  return (
    <div className="border border-flag/60 bg-flag/[0.07] rounded-sm px-4 py-3.5 space-y-2.5">
      <div className="inline-flex items-center gap-2.5 text-flag">
        <ShieldAlert size={17} className="shrink-0" />
        <span className="font-mono text-xs tracking-wider uppercase">
          Review needed before you submit this
        </span>
      </div>
      <ul className="text-sm text-ink-soft list-disc list-inside space-y-1 leading-relaxed">
        {flaggedItems.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
