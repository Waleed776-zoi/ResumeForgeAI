"use client";

import { Download } from "lucide-react";
import { useTemplatePreference } from "@/lib/use-template-preference";

/**
 * Downloads for the cover letter, next to the cover letter.
 *
 * They sit here rather than in TemplatePicker because that panel is about
 * choosing a resume layout — burying a second document's downloads under a
 * row of resume thumbnails is where features go to be undiscovered. The
 * template still applies: both files share the reader's chosen typeface and
 * letterhead so they arrive looking like one submission.
 *
 * Understated on purpose. The resume is the primary artefact and keeps the
 * filled button; the letter is a companion and gets text links.
 */
export function CoverLetterActions({
  applicationId,
}: {
  applicationId: string;
}) {
  const { selected } = useTemplatePreference();

  const href = (format: "pdf" | "docx") =>
    `/api/export/${format}?id=${applicationId}&template=${selected}&doc=cover-letter`;

  return (
    <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-line pt-4 text-sm">
      <span className="eyebrow text-ink-soft">Download letter</span>

      <a
        href={href("docx")}
        className="inline-flex items-center gap-1.5 font-medium text-accent transition-opacity hover:opacity-80"
      >
        <Download size={14} aria-hidden />
        DOCX
      </a>

      <a
        href={href("pdf")}
        className="inline-flex items-center gap-1.5 text-ink-soft transition-colors hover:text-accent"
      >
        <Download size={14} aria-hidden />
        PDF
      </a>
    </div>
  );
}
