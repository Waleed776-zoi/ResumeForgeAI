"use client";

import { requestSceneReplay } from "@/lib/scene-replay";

/**
 * An in-page link that also restarts the animation it lands on.
 *
 * Without this, the second visitor to press it gets nothing: the sequence
 * already played on the way past, so "see a line get rewritten" scrolls to a
 * finished paragraph and the promise in the label goes unkept.
 *
 * It stays a real anchor with a real `href`, so it works as an ordinary jump
 * link when JavaScript is unavailable — the replay is the enhancement, not
 * the mechanism.
 */
export function ReplayLink({
  targetId,
  scene,
  className,
  children,
}: {
  targetId: string;
  scene: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={`#${targetId}`}
      className={className}
      onClick={(event) => {
        const target = document.getElementById(targetId);
        if (!target) return; // let the browser do its default thing

        event.preventDefault();

        const reduced = window.matchMedia(
          "(prefers-reduced-motion: reduce)"
        ).matches;

        target.scrollIntoView({
          behavior: reduced ? "auto" : "smooth",
          block: "start",
        });

        // The scene re-arms its own scroll hold on replay, so this fires now
        // and the animation waits at its first frame until the smooth scroll
        // actually brings it into view.
        requestSceneReplay(scene);

        // Keep the address bar honest without triggering a second jump.
        history.replaceState(null, "", `#${targetId}`);
      }}
    >
      {children}
    </a>
  );
}
