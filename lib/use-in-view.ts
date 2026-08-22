"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

/**
 * `useLayoutEffect` on the client, `useEffect` on the server.
 *
 * The distinction matters here: this hook's job is to HIDE something that was
 * server-rendered visible, and doing that after paint would show a finished
 * scorecard for one frame before resetting it to zero.
 */
const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

/**
 * `finished` — show the end state and never animate (server render, no
 * IntersectionObserver, or the reader asked for reduced motion).
 * `armed` — hold at the start, waiting to be scrolled to.
 * `running` — play.
 *
 * Three states rather than a boolean because "not animating" and "waiting to
 * animate" need opposite pixels on screen, and collapsing them into one flag
 * is how you end up either flashing the answer or showing a permanent zero to
 * someone whose browser was never going to animate it.
 */
export type RevealPhase = "finished" | "armed" | "running";

/**
 * Reports when an element has been scrolled into view, as state.
 *
 * The sibling hook in use-reveal.ts pauses CSS animations, which is enough
 * when the browser owns the animation. A counter ticking from 0 to 86 is
 * driven from JavaScript and has to be *told* when to start, so this one
 * returns a phase instead of manipulating a class.
 *
 * It starts `finished`, so server-rendered output and any browser without
 * IntersectionObserver show the real numbers rather than a column of zeros —
 * the animation is layered onto a correct page, not the only way to read it.
 *
 * `replayKey` re-arms it on demand; `retrigger` re-arms it whenever the
 * element has scrolled fully out of view, so coming back to a section plays
 * it again instead of showing a sequence that already finished unwatched.
 */
export function useInView<T extends HTMLElement>({
  enter = 0.35,
  rootMargin = "0px",
  replayKey = 0,
  retrigger = false,
}: {
  /** Fraction of the element that must be on screen before it plays. */
  enter?: number;
  rootMargin?: string;
  replayKey?: number;
  /** Re-arm once it has fully left, so scrolling back plays it again. */
  retrigger?: boolean;
} = {}) {
  const ref = useRef<T>(null);
  const [phase, setPhase] = useState<RevealPhase>("finished");

  useIsomorphicLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (
      typeof IntersectionObserver === "undefined" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setPhase("finished");
      return;
    }

    /*
     * Whether to arm depends on where the element is RIGHT NOW, and this is
     * the subtle part.
     *
     * The server sends a finished card — real numbers, full bars — and the
     * browser paints that long before this code runs. Arming unconditionally
     * therefore yanks a card the reader may be looking at back to zero, and
     * the CSS transitions on it dutifully animate the yank. That is what
     * "the animation plays on load" looks like from the outside: not the
     * sequence firing early, but the reset being visible.
     *
     * So: off screen, arm silently — nobody sees the reset. On screen, go
     * straight to running, where starting from zero is the first frame of an
     * animation rather than a card undoing itself.
     */
    const box = el.getBoundingClientRect();
    const viewport =
      window.innerHeight || document.documentElement.clientHeight;
    const visible = Math.min(box.bottom, viewport) - Math.max(box.top, 0);
    const ratio = box.height > 0 ? Math.max(0, visible) / box.height : 0;

    setPhase(ratio >= enter ? "running" : "armed");

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.intersectionRatio >= enter) {
            setPhase("running");
          } else if (retrigger && entry.intersectionRatio === 0) {
            // Only once it has left completely. The gap between 0 and `enter`
            // is hysteresis: without it, parking the scroll on the boundary
            // would flip the card between states on every wheel tick.
            setPhase("armed");
          }
        }
      },
      { threshold: [0, enter], rootMargin }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [enter, rootMargin, replayKey, retrigger]);

  return { ref, phase };
}

/**
 * Milliseconds elapsed since the phase became `running`, capped at `duration`.
 *
 * One clock for a whole card rather than a timer per row: every value on
 * screen is then a pure function of the same number, so a stagger cannot
 * drift and the sequence cannot end with one row still short of its target.
 *
 * The phase change is absorbed during render rather than in an effect. An
 * effect would run after paint, which means one frame showing the previous
 * phase's numbers — the finished score appearing for 16ms just before
 * counting up from zero.
 */
export function useElapsed(phase: RevealPhase, duration: number) {
  const [elapsed, setElapsed] = useState(duration);
  const [seenPhase, setSeenPhase] = useState(phase);

  if (seenPhase !== phase) {
    setSeenPhase(phase);
    setElapsed(phase === "finished" ? duration : 0);
  }

  useEffect(() => {
    if (phase !== "running") return;

    let frame = 0;
    const started = performance.now();

    const tick = (now: number) => {
      const next = Math.min(duration, now - started);
      setElapsed(next);
      if (next < duration) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [phase, duration]);

  return elapsed;
}
