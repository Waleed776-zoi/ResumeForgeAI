"use client";

import React from "react";
import { cn } from "@/lib/utils";

/**
 * Hover border gradient — adapted from Aceternity UI.
 *
 * Same public API as the original (`as`, `containerClassName`, `className`,
 * `duration`, `clockwise`), two deliberate changes underneath:
 *
 * 1. A continuously rotating conic arc replaces the original's four fixed
 *    radial gradients stepped by a JS interval. The original visibly jumps
 *    between TOP → LEFT → BOTTOM → RIGHT because CSS cannot interpolate
 *    between two different radial-gradient images; rotation is genuinely
 *    smooth and needs no timer, no state, and no animation library.
 *
 * 2. It runs on the compositor as a single transform, so there's no per-frame
 *    React work and nothing to clean up on unmount.
 *
 * The arc is emerald and stays dim until hover, which keeps it consistent
 * with the rest of the interface: the accent marks intent, not decoration.
 */
export function HoverBorderGradient({
  children,
  containerClassName,
  className,
  as: Tag = "button",
  duration = 2.5,
  clockwise = true,
  ...props
}: React.PropsWithChildren<{
  as?: React.ElementType;
  containerClassName?: string;
  className?: string;
  duration?: number;
  clockwise?: boolean;
}> &
  // The upstream component types this as HTMLAttributes, which silently
  // excludes button-only props — so `type="submit"` fails to compile on a
  // component whose default element IS a button. Button attributes are the
  // useful superset here.
  Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "className">) {
  return (
    <Tag
      className={cn(
        "group relative inline-flex w-fit items-center justify-center overflow-hidden rounded-full p-px",
        "bg-line/80 transition-colors duration-500 hover:bg-line",
        containerClassName
      )}
      {...props}
    >
      {/*
        Inset by -150% so the rotating square always covers the corners of a
        wide button — a rotating element only inscribes its parent if it is
        larger than the parent's diagonal.
      */}
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-[-150%] animate-border-sweep opacity-45",
          "transition-opacity duration-500 group-hover:opacity-100",
          clockwise ? "" : "[animation-direction:reverse]"
        )}
        style={
          {
            "--sweep-duration": `${duration}s`,
            background:
              "conic-gradient(from 0deg, transparent 0deg, transparent 300deg, #46A88A 340deg, #5BBF9D 355deg, transparent 360deg)",
          } as React.CSSProperties
        }
      />

      <span
        className={cn(
          "relative z-10 rounded-full bg-surface px-6 py-2.5 text-sm font-medium text-ink",
          "transition-colors duration-300 group-hover:bg-raised",
          className
        )}
      >
        {children}
      </span>
    </Tag>
  );
}
