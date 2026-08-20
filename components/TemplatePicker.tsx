"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { HoverHighlight } from "@/components/ui/hover-highlight";
import {
  TEMPLATE_LIST,
  DEFAULT_TEMPLATE,
  isTemplateId,
  type TemplateId,
} from "@/generators/templates";

const STORAGE_KEY = "resumeforge:template";

/**
 * Abstract layout thumbnails.
 *
 * Drawn rather than screenshotted so they can never go stale against the
 * renderers, and so the choice reads at a glance: where the name sits, how
 * headings are marked, how dense the text runs. Purely decorative.
 */
function Thumb({ id, active }: { id: TemplateId; active: boolean }) {
  // Marks are graphite on paper, not ink-soft on surface: the thumbnail
  // depicts the printed document, so it keeps the document's colours even
  // though the UI around it is dark.
  const bar = active ? "bg-accent" : "bg-paper/75";
  const rule = active ? "bg-accent/50" : "bg-paper/25";

  const lines = (count: number, gap: string) => (
    <div className={`flex flex-col ${gap}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`h-[2px] ${rule}`}
          style={{ width: i === count - 1 ? "70%" : "100%" }}
        />
      ))}
    </div>
  );

  return (
    <div
      aria-hidden
      className="w-full aspect-[8.5/11] bg-document rounded-sm p-2.5 overflow-hidden shadow-sm"
    >
      {id === "classic" && (
        <div className="space-y-2">
          <div className={`h-[5px] w-1/2 mx-auto ${bar}`} />
          <div className={`h-[2px] w-2/3 mx-auto ${rule}`} />
          <div className="space-y-1 pt-1">
            <div className={`h-[3px] w-1/3 ${bar}`} />
            <div className={`h-[1px] w-full ${rule}`} />
            {lines(3, "gap-[3px]")}
          </div>
          <div className="space-y-1">
            <div className={`h-[3px] w-1/4 ${bar}`} />
            <div className={`h-[1px] w-full ${rule}`} />
            {lines(4, "gap-[3px]")}
          </div>
        </div>
      )}

      {id === "modern" && (
        <div className="space-y-3">
          <div className={`h-[6px] w-3/5 ${bar}`} />
          <div className={`h-[2px] w-1/2 ${rule}`} />
          <div className="space-y-1.5 pt-2">
            <div className={`h-[3px] w-1/3 ${bar}`} />
            {lines(3, "gap-[4px]")}
          </div>
          <div className="space-y-1.5">
            <div className={`h-[3px] w-1/4 ${bar}`} />
            {lines(3, "gap-[4px]")}
          </div>
        </div>
      )}

      {id === "compact" && (
        <div className="space-y-1.5">
          <div className={`h-[4px] w-2/5 ${bar}`} />
          <div className={`h-[2px] w-3/5 ${rule}`} />
          <div className="space-y-[3px]">
            <div className={`h-[2px] w-1/4 ${bar}`} />
            <div className={`h-[1px] w-full ${rule}`} />
            {lines(5, "gap-[2px]")}
          </div>
          <div className="space-y-[3px]">
            <div className={`h-[2px] w-1/4 ${bar}`} />
            <div className={`h-[1px] w-full ${rule}`} />
            {lines(5, "gap-[2px]")}
          </div>
        </div>
      )}
    </div>
  );
}

export function TemplatePicker({ applicationId }: { applicationId: string }) {
  const [selected, setSelected] = useState<TemplateId>(DEFAULT_TEMPLATE);

  // Read the stored preference after mount rather than during render: the
  // server has no localStorage, and reading it during render would make the
  // first paint disagree with the server's HTML.
  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (isTemplateId(stored)) setSelected(stored);
  }, []);

  function choose(id: TemplateId) {
    setSelected(id);
    window.localStorage.setItem(STORAGE_KEY, id);
  }

  const href = (format: "pdf" | "docx") =>
    `/api/export/${format}?id=${applicationId}&template=${selected}`;

  return (
    <section className="panel p-7">
      <h2 className="font-display text-[22px] mb-1.5">Choose a template</h2>
      <p className="text-ink-soft text-sm mb-5">
        Same words, different typesetting. Every template is single-column
        with no tables or images, so all three stay readable to the software
        that parses your resume.
      </p>

      {/* The highlight travels between cards; selection stays a border and a
          check, so the choice is never communicated by hover alone. */}
      <HoverHighlight className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {TEMPLATE_LIST.map((template) => {
          const active = template.id === selected;

          return (
            <button
              key={template.id}
              type="button"
              data-highlight-item
              onClick={() => choose(template.id)}
              aria-pressed={active}
              className={`relative z-10 text-left rounded-lg p-3 border transition-colors duration-300 ${
                active
                  ? "border-accent/70 bg-accent-soft/40"
                  : "border-line hover:border-accent/40"
              }`}
            >
              <Thumb id={template.id} active={active} />

              <div className="flex items-center gap-1.5 mt-3 mb-1">
                <span className="font-medium text-sm">{template.name}</span>
                {active && <Check size={14} className="text-accent" />}
              </div>
              <p className="text-ink-soft text-xs leading-relaxed">
                {template.description}
              </p>
            </button>
          );
        })}
      </HoverHighlight>

      <div className="flex flex-wrap gap-3 mt-6">
        <a
          href={href("docx")}
          className="bg-accent text-paper px-6 py-3 rounded font-medium hover:bg-accent-bright transition-colors text-sm"
        >
          Download DOCX
        </a>
        <a
          href={href("pdf")}
          className="border border-line px-6 py-3 rounded font-medium hover:border-accent transition-colors text-sm"
        >
          Download PDF
        </a>
      </div>
    </section>
  );
}
