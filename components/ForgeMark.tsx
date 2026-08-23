/**
 * The ResumeForge mark.
 *
 * It replaced a stock shield, which was doing the product a disservice twice
 * over: a shield says "security", which is not what this is, and the same
 * shield already appears three other places in the interface meaning
 * "verified". A logo and a status icon should never be the same glyph — the
 * one on the integrity badge is making a claim about YOUR document, and it
 * cannot do that while it is also the company letterhead.
 *
 * WHAT IT IS: a page whose top corner has been turned, with a check inside.
 * Three ideas, one silhouette:
 *
 *   the page      — the artefact, and the only thing this product touches
 *   the turned corner — the tailoring; the sheet beneath is the original,
 *                   showing through, which is the whole promise in one shape
 *   the check     — verified, and the only part drawn in emerald
 *
 * The corner is filled rather than outlined for exactly that reason: an
 * outlined dog-ear is a page that was folded, a filled one is a second sheet
 * visible underneath. Original → tailored → verified, in three paths.
 *
 * DRAWN FOR 16px, not for a slide. Three elements is the ceiling at header
 * size; the "resume text lines" that a bigger version would carry were tried
 * and cut, because at 16px they close up into a grey smudge. The geometry
 * sits on lucide's 24-unit grid with matching stroke weight and round joins,
 * so it belongs to the same family as every other icon on the page.
 *
 * Two-tone by design: the page inherits `currentColor` from whatever it sits
 * in, and only the check is accent — so the mark obeys the same rule as the
 * rest of the interface, where emerald means confirmed and nothing else.
 */
export function ForgeMark({
  size = 20,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {/* The page, with its top-right corner cut away. */}
      <path d="M14 3H6.5A1.5 1.5 0 0 0 5 4.5v15A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5V8z" />
      {/* The sheet underneath, showing through the turned corner. */}
      <path
        d="M14 3v3.5A1.5 1.5 0 0 0 15.5 8H19z"
        fill="currentColor"
        fillOpacity={0.16}
      />
      {/* Verified. The one stroke that earns the accent. */}
      <path d="M8.75 14.25 11 16.5l4.25-4.5" className="stroke-accent" />
    </svg>
  );
}
