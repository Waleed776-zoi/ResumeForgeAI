"use client";

import { useCallback, useEffect, useState } from "react";
import { SCENE_REPLAY_EVENT, type SceneReplayDetail } from "@/lib/scene-replay";

/**
 * Subscribes a scene to replay requests aimed at its name.
 *
 * Returns a run counter and a local trigger. Remount the animated subtree
 * with `key={run}` — the elements come back holding their 0% keyframes,
 * which is the whole of the replay.
 */
export function useSceneReplay(scene: string) {
  const [run, setRun] = useState(0);
  const replay = useCallback(() => setRun((n) => n + 1), []);

  useEffect(() => {
    const onReplay = (event: Event) => {
      const detail = (event as CustomEvent<SceneReplayDetail>).detail;
      if (detail?.scene === scene) replay();
    };

    window.addEventListener(SCENE_REPLAY_EVENT, onReplay);
    return () => window.removeEventListener(SCENE_REPLAY_EVENT, onReplay);
  }, [scene, replay]);

  return { run, replay };
}
