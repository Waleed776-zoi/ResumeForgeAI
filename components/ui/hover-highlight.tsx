"use client";

import React, { useCallback, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Travelling hover highlight — adapted from Aceternity's card-hover-effect.
 *
 * The effect that matters in the original isn't the highlight itself, it's
 * that ONE highlight slides from card to card. Aceternity gets that from
 * framer-motion's shared-layout `layoutId`, which measures the old and new
 * positions and interpolates between them (a FLIP animation).
 *
 * The same result is a single absolutely-positioned panel whose transform and
 * size are read off the hovered child, with a CSS transition doing the
 * interpolation. That is FLIP, minus the library — and it stays on the
 * compositor rather than re-rendering on every frame.
 *
 * Children are laid out by the caller; this only draws behind them. It
 * deliberately does nothing on touch (no hover) and nothing for keyboard
 * users beyond what focus styles already provide, so it can never become the
 * only affordance communicating selection.
 */
export function HoverHighlight({
  children,
  className,
  radius = "rounded-lg",
}: {
  children: React.ReactNode;
  className?: string;
  radius?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<{
    x: number;
    y: number;
    w: number;
    h: number;
  } | null>(null);

  const track = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const container = containerRef.current;
    if (!container) return;

    // Nearest element child under the pointer that is a direct grid item.
    const target = (event.target as HTMLElement).closest<HTMLElement>(
      "[data-highlight-item]"
    );
    if (!target) return setBox(null);

    const c = container.getBoundingClientRect();
    const t = target.getBoundingClientRect();
    setBox({ x: t.left - c.left, y: t.top - c.top, w: t.width, h: t.height });
  }, []);

  return (
    <div
      ref={containerRef}
      onPointerMove={track}
      onPointerLeave={() => setBox(null)}
      className={cn("relative", className)}
    >
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute left-0 top-0 z-0 bg-raised/70",
          radius,
          // Position and size animate; opacity fades so the first appearance
          // doesn't fly in from the corner.
          "transition-[transform,width,height,opacity] duration-300 ease-out",
          box ? "opacity-100" : "opacity-0"
        )}
        style={{
          transform: `translate3d(${box?.x ?? 0}px, ${box?.y ?? 0}px, 0)`,
          width: box?.w ?? 0,
          height: box?.h ?? 0,
        }}
      />
      {children}
    </div>
  );
}
