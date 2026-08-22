/**
 * Names and the dispatch side of "restart that animation over there".
 *
 * A window event rather than context or a store, for one reason: the sender
 * and the receiver are siblings under a Server Component, so there is no
 * shared client boundary to hang a provider from. Lifting one would mean
 * making the whole page a Client Component to coordinate a replay button — a
 * large architectural cost for a small piece of choreography.
 *
 * NO REACT IN THIS FILE, deliberately. A Server Component has to be able to
 * read REWRITE_SCENE to address the scene, and it cannot import from either
 * side of the usual split: a `"use client"` module hands the server opaque
 * client references instead of values, while a module containing `useState`
 * fails the build outright. What is left is a module that mentions neither —
 * so the hook lives next door in use-scene-replay.ts.
 *
 * Scenes are addressed by name so a second animated section can be added
 * later without every link replaying every scene on the page.
 */
export const SCENE_REPLAY_EVENT = "resumeforge:scene-replay";

export const REWRITE_SCENE = "rewrite";

export const READINESS_SCENE = "readiness";

export type SceneReplayDetail = { scene: string };

export function requestSceneReplay(scene: string) {
  window.dispatchEvent(
    new CustomEvent<SceneReplayDetail>(SCENE_REPLAY_EVENT, {
      detail: { scene },
    })
  );
}
