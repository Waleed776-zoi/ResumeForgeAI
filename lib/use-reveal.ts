import { useEffect, useRef } from "react";

/**
 * Holds an element's CSS animations until it scrolls into view.
 *
 * Deliberately NOT a `useState`-driven reveal. The usual pattern renders
 * everything at `opacity-0` and switches it on from JavaScript, which means a
 * visitor whose JS failed — or whose hydration is still in flight — is looking
 * at a column of invisible text. Here the markup ships with its animations
 * already declared and already running; this hook only *pauses* them. If the
 * hook never runs, the sequence simply plays on load, which is the old
 * behaviour and a perfectly good fallback.
 *
 * The pause lands one effect after mount, during the animation's opening
 * delay, when every element is still holding its 0% keyframe under
 * `animation-fill-mode: both`. Nothing has visibly moved yet, so there is no
 * flash to see.
 *
 * Anyone who asked for reduced motion is skipped entirely: no hold, no
 * observer, and the global media query collapses the animations to their end
 * state immediately.
 *
 * `replayKey` re-arms the whole thing. Bumping it after a replay puts the
 * hold back and starts watching again, so a sequence triggered from the top
 * of the page waits out the smooth scroll instead of playing to an empty
 * viewport and being finished by the time the reader lands on it.
 */
export function useRevealOnScroll<T extends HTMLElement>({
  threshold = 0.3,
  rootMargin = "0px 0px -12% 0px",
  replayKey = 0,
}: { threshold?: number; rootMargin?: string; replayKey?: number } = {}) {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (
      typeof IntersectionObserver === "undefined" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    // Already on screen (the hero at mount, or a replay of a section the
    // reader is currently looking at): let it play rather than waiting for a
    // scroll that will never come.
    const box = el.getBoundingClientRect();
    if (box.top < window.innerHeight * 0.85 && box.bottom > 0) return;

    el.classList.add("motion-hold");

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          el.classList.remove("motion-hold");
          observer.disconnect();
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(el);
    return () => {
      observer.disconnect();
      el.classList.remove("motion-hold");
    };
  }, [threshold, rootMargin, replayKey]);

  return ref;
}
