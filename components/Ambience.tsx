/**
 * Background ambience.
 *
 * Two things, both quiet:
 *
 * 1. Slow emerald light fields. Radial gradients that fade to transparent —
 *    no blur filter, because the gradient's own falloff is already soft and
 *    a 100px blur on a viewport-sized element is a real compositing cost for
 *    an effect nobody should consciously notice. They drift on 50–70s cycles,
 *    which is slow enough to read as depth rather than as motion.
 *
 * 2. Grain. A single inline SVG turbulence, held at ~3% opacity. This is the
 *    detail that separates an expensive dark interface from a flat one: pure
 *    flat #14151A reads as an unfinished panel, while the same colour under
 *    fine grain reads as a surface. It's generated inline rather than loaded,
 *    so it costs no request and can't be blocked.
 *
 * Entirely decorative, so it's aria-hidden, pointer-events-none, and sits
 * behind everything. The global prefers-reduced-motion rule freezes the drift
 * while leaving the depth intact.
 */

const GRAIN =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)'/%3E%3C/svg%3E";

export function Ambience() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      <div
        className="absolute -top-[22vh] -left-[12vw] h-[78vh] w-[78vh] rounded-full opacity-[0.13] animate-drift-slow"
        style={{
          background:
            "radial-gradient(circle at center, #46A88A 0%, rgba(70,168,138,0.35) 38%, transparent 68%)",
        }}
      />
      <div
        className="absolute -bottom-[26vh] -right-[10vw] h-[66vh] w-[66vh] rounded-full opacity-[0.16] animate-drift-slower"
        style={{
          background:
            "radial-gradient(circle at center, #1F4D3E 0%, rgba(31,77,62,0.4) 42%, transparent 70%)",
        }}
      />

      {/* Keeps the light fields from lifting the page off its base colour. */}
      <div className="absolute inset-0 bg-gradient-to-b from-paper/40 via-transparent to-paper/70" />

      <div
        className="absolute inset-0 opacity-[0.032] mix-blend-overlay"
        style={{ backgroundImage: `url("${GRAIN}")` }}
      />
    </div>
  );
}
