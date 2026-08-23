"use client";

import React, { useCallback, useRef, useState } from "react";
import { Upload, FileText, X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * File upload — adapted from Aceternity UI.
 *
 * Keeps the original's shape and feel: a large click-or-drop target, a masked
 * grid backdrop, a card that lifts on hover, and a file row that animates in
 * carrying name, size, type and modified date.
 *
 * Three deliberate departures:
 *
 * 1. NO react-dropzone. The behaviour needed here — one file, drag state,
 *    drop handling — is about twenty lines of native DOM events. A dependency
 *    that exists to abstract those is not worth its weight.
 *
 * 2. NO motion/framer-motion. The hover lift and card entry are transforms
 *    and opacity; CSS does both on the compositor, and this project already
 *    animates that way.
 *
 * 3. IT IS KEYBOARD ACCESSIBLE. The original wires onClick to a plain div
 *    with a hidden input, so the control cannot be reached by Tab or fired by
 *    Enter — for the primary action of a resume tool that isn't acceptable.
 *    The target is a real <button>, the input keeps a real <label>, and drag
 *    state is announced politely.
 */

const GRID_COLS = 22;
const GRID_ROWS = 9;

function GridPattern({ active }: { active: boolean }) {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,black_25%,transparent_72%)]"
    >
      <div className="flex h-full w-full flex-wrap items-center justify-center gap-x-px gap-y-px">
        {Array.from({ length: GRID_COLS * GRID_ROWS }).map((_, i) => {
          const col = i % GRID_COLS;
          const row = Math.floor(i / GRID_COLS);
          // A stable pseudo-random so the texture doesn't reshuffle on every
          // render, and doesn't differ between server and client.
          const lit = (col * 7 + row * 13) % 11 === 0;
          return (
            <div
              key={i}
              className={cn(
                "h-6 w-6 rounded-[1px] transition-colors duration-700",
                lit
                  ? active
                    ? "bg-accent/25"
                    : "bg-line/70"
                  : active
                    ? "bg-accent/[0.06]"
                    : "bg-surface/60"
              )}
            />
          );
        })}
      </div>
    </div>
  );
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function FileUpload({
  onChange,
  accept = ".pdf,.docx",
  className,
}: {
  onChange?: (files: File[]) => void;
  accept?: string;
  className?: string;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const accept_ = useCallback(
    (files: FileList | File[] | null) => {
      const next = files?.[0] ?? null;
      if (!next) return;
      setFile(next);
      onChange?.([next]);
    },
    [onChange]
  );

  const clear = useCallback(() => {
    setFile(null);
    if (inputRef.current) inputRef.current.value = "";
    onChange?.([]);
  }, [onChange]);

  return (
    <div className={cn("w-full", className)}>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={(e) => {
          // Only clear when the pointer truly leaves the zone, not when it
          // crosses onto a child element.
          if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            setDragging(false);
          }
        }}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          accept_(e.dataTransfer.files);
        }}
        className={cn(
          "relative overflow-hidden rounded-lg border border-dashed transition-colors duration-300",
          dragging ? "border-accent/70 bg-accent-soft/40" : "border-steel"
        )}
      >
        <GridPattern active={dragging} />

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="group/file relative z-10 flex w-full cursor-pointer flex-col items-center justify-center px-6 py-11 text-center"
        >
          <span
            className={cn(
              "mb-4 flex h-11 w-11 items-center justify-center rounded-full border transition-all duration-300",
              "border-line bg-surface",
              "group-hover/file:-translate-y-1 group-hover/file:border-accent/50 group-hover/file:bg-raised",
              dragging && "-translate-y-1 border-accent/60 bg-raised"
            )}
          >
            <Upload
              size={17}
              className={cn(
                "transition-colors duration-300",
                dragging
                  ? "text-accent"
                  : "text-ink-soft group-hover/file:text-accent"
              )}
            />
          </span>

          <span className="font-display text-lg text-ink">
            {dragging ? "Drop it here" : "Upload your resume"}
          </span>
          <span className="mt-1.5 text-sm text-ink-soft">
            Drag and drop, or click to browse — PDF or DOCX
          </span>
        </button>

        <label htmlFor="resume-upload" className="sr-only">
          Upload your resume
        </label>
        <input
          ref={inputRef}
          id="resume-upload"
          type="file"
          accept={accept}
          className="sr-only"
          onChange={(e) => accept_(e.target.files)}
        />
      </div>

      <div aria-live="polite">
        {file && (
          <div className="mt-3 flex animate-lift-in items-center gap-3.5 rounded-lg border border-line bg-surface/70 px-4 py-3.5">
            <FileText size={17} className="shrink-0 text-accent" />

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-ink">{file.name}</p>
              <p className="mt-0.5 font-mono text-[11px] text-ink-soft">
                {formatBytes(file.size)}
                {file.type ? ` · ${file.type.split("/").pop()}` : ""}
                {file.lastModified
                  ? ` · modified ${new Date(file.lastModified).toLocaleDateString()}`
                  : ""}
              </p>
            </div>

            <button
              type="button"
              onClick={clear}
              aria-label={`Remove ${file.name}`}
              className="shrink-0 rounded p-1 text-ink-soft transition-colors hover:text-flag"
            >
              <X size={15} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
