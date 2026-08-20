"use client";

import React, { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

/**
 * Sparkles — adapted from Aceternity UI.
 *
 * Same prop surface as the original (background, minSize, maxSize, speed,
 * particleColor, particleDensity), implemented on a raw canvas instead of
 * @tsparticles/react + @tsparticles/engine + @tsparticles/slim + motion.
 *
 * That stack is roughly 150 kB of JavaScript to draw dots that twinkle. It's
 * a general-purpose particle engine — collisions, physics, interaction modes,
 * presets — and this page uses none of it. Ninety lines of canvas gives the
 * same picture at a rounding error of the size, which matters on a landing
 * page where the effect must never be the reason the page is slow to feel
 * ready.
 *
 * Honours prefers-reduced-motion by painting one static field and stopping:
 * the texture survives, the twinkling doesn't.
 */

interface Spark {
  x: number;
  y: number;
  r: number;
  base: number;
  phase: number;
  speed: number;
}

export function SparklesCore({
  className,
  background = "transparent",
  minSize = 0.5,
  maxSize = 1.4,
  speed = 1,
  particleColor = "#F2EFE9",
  particleDensity = 60,
}: {
  className?: string;
  background?: string;
  minSize?: number;
  maxSize?: number;
  speed?: number;
  particleColor?: string;
  particleDensity?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    let sparks: Spark[] = [];
    let frame = 0;
    let width = 0;
    let height = 0;

    const build = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;

      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Density is per 10,000 px² so a wide hero doesn't get sparser than a
      // narrow one on mobile.
      const count = Math.round((width * height) / 10_000) * (particleDensity / 60);

      sparks = Array.from({ length: Math.max(12, Math.min(260, count)) }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        r: minSize + Math.random() * (maxSize - minSize),
        base: 0.25 + Math.random() * 0.6,
        phase: Math.random() * Math.PI * 2,
        speed: (0.4 + Math.random() * 0.9) * speed,
      }));
    };

    const paint = (t: number) => {
      ctx.clearRect(0, 0, width, height);

      if (background !== "transparent") {
        ctx.fillStyle = background;
        ctx.fillRect(0, 0, width, height);
      }

      for (const s of sparks) {
        // Static field when motion is reduced: opacity stops moving.
        const twinkle = reduced
          ? s.base
          : s.base * (0.45 + 0.55 * Math.sin(t * 0.001 * s.speed + s.phase));

        ctx.globalAlpha = Math.max(0, twinkle);
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = particleColor;
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    };

    build();
    paint(0);

    if (!reduced) {
      const loop = (t: number) => {
        paint(t);
        frame = requestAnimationFrame(loop);
      };
      frame = requestAnimationFrame(loop);
    }

    const observer = new ResizeObserver(() => {
      build();
      paint(performance.now());
    });
    observer.observe(canvas);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [background, minSize, maxSize, speed, particleColor, particleDensity]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className={cn("pointer-events-none block h-full w-full", className)}
    />
  );
}
