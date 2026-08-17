import { ShieldCheck, ShieldAlert } from "lucide-react";

// The signature element of this product: a verification stamp, not a
// generic "AI-generated" disclaimer. It's the one visual promise the
// whole pipeline exists to keep — so it gets a deliberate, seal-like
// treatment rather than a quiet inline icon.
export function IntegrityBadge({
  passed,
  flaggedItems,
}: {
  passed: boolean;
  flaggedItems: string[];
}) {
  if (passed) {
    return (
      <div className="inline-flex items-center gap-2 border-2 border-accent text-accent px-4 py-2 rounded-sm">
        <ShieldCheck size={18} />
        <span className="text-sm font-medium tracking-wide">
          Verified — no fabricated information
        </span>
      </div>
    );
  }

  return (
    <div className="border-2 border-flag rounded-sm px-4 py-3 space-y-2">
      <div className="inline-flex items-center gap-2 text-flag">
        <ShieldAlert size={18} />
        <span className="text-sm font-medium tracking-wide">
          Review needed before you submit this
        </span>
      </div>
      <ul className="text-sm text-ink-soft list-disc list-inside">
        {flaggedItems.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
