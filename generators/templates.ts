/**
 * Resume templates.
 *
 * A template is *only* styling. Both exporters render the same
 * ResumeDocument, so switching template can never change which sections
 * appear, their order, or a single word of their content — it changes type,
 * spacing, alignment and rules. That boundary is what makes three templates
 * cheap to maintain instead of three codebases to keep in sync.
 *
 * All measurements are in POINTS, the one unit both renderers can convert
 * from: pdf-lib works in points directly, and Word wants twips (pt × 20) and
 * half-points (pt × 2). Defining the spec once in a shared unit is what stops
 * the PDF and DOCX drifting apart visually the way they once drifted apart on
 * content.
 *
 * Every template is single-column, real text, no tables or images — the
 * constraint that keeps a resume parseable. Templates differ in how they
 * look, never in whether a machine can read them.
 */

export const TEMPLATE_IDS = ["classic", "modern", "compact"] as const;
export type TemplateId = (typeof TEMPLATE_IDS)[number];

export interface ResumeTemplate {
  id: TemplateId;
  name: string;
  /** Shown in the picker — say who it's for, not what it looks like. */
  description: string;
  family: "serif" | "sans";
  headerAlign: "center" | "left";
  uppercaseName: boolean;
  /** Hairline under each section heading. "short" underlines the words only. */
  sectionRule: "full" | "short" | "none";
  /** Letter-spacing, in points. */
  tracking: { name: number; section: number };
  size: {
    name: number;
    contact: number;
    section: number;
    role: number;
    meta: number;
    body: number;
  };
  /** Line height as a multiple of body size. */
  leading: number;
  margin: number;
  space: {
    afterMasthead: number;
    beforeSection: number;
    afterRule: number;
    betweenRoles: number;
    afterSection: number;
  };
  /** Section headings only; body text is always near-black for contrast. */
  headingColor: "ink" | "accent";
}

const CLASSIC: ResumeTemplate = {
  id: "classic",
  name: "Classic",
  description:
    "Centred serif masthead with ruled sections. The conventional academic and research CV — the safest choice for universities, journals, and traditional employers.",
  family: "serif",
  headerAlign: "center",
  uppercaseName: true,
  sectionRule: "full",
  tracking: { name: 1.6, section: 1.1 },
  size: { name: 19, contact: 8.8, section: 9.6, role: 10.2, meta: 8.8, body: 9.6 },
  leading: 1.34,
  margin: 56,
  space: {
    afterMasthead: 6,
    beforeSection: 6,
    afterRule: 11,
    betweenRoles: 7,
    afterSection: 6,
  },
  headingColor: "ink",
};

const MODERN: ResumeTemplate = {
  id: "modern",
  name: "Modern",
  description:
    "Left-aligned sans-serif with generous whitespace and unruled headings. Reads as current rather than formal — suits software, product, and startup applications.",
  family: "sans",
  headerAlign: "left",
  uppercaseName: false,
  sectionRule: "none",
  tracking: { name: 0, section: 1.5 },
  size: { name: 21, contact: 9, section: 8.8, role: 10.4, meta: 8.8, body: 9.6 },
  leading: 1.44, // airier: whitespace is this template's whole idea
  margin: 62,
  space: {
    afterMasthead: 12,
    beforeSection: 12,
    // No rule to separate heading from content, so the gap has to do that
    // work on its own.
    afterRule: 11,
    betweenRoles: 10,
    afterSection: 10,
  },
  headingColor: "accent",
};

const COMPACT: ResumeTemplate = {
  id: "compact",
  name: "Compact",
  description:
    "Tighter type and margins to fit more on each page. For long histories — many roles, or a publication list that would otherwise spill onto a third page.",
  family: "serif",
  headerAlign: "left",
  uppercaseName: true,
  sectionRule: "full",
  tracking: { name: 0.8, section: 0.8 },
  size: { name: 15.5, contact: 8.2, section: 8.8, role: 9.6, meta: 8.2, body: 9 },
  leading: 1.2,
  margin: 44,
  space: {
    afterMasthead: 3,
    beforeSection: 3,
    afterRule: 7,
    betweenRoles: 4,
    afterSection: 3,
  },
  headingColor: "ink",
};

export const TEMPLATES: Record<TemplateId, ResumeTemplate> = {
  classic: CLASSIC,
  modern: MODERN,
  compact: COMPACT,
};

export const TEMPLATE_LIST: ResumeTemplate[] = TEMPLATE_IDS.map(
  (id) => TEMPLATES[id]
);

export const DEFAULT_TEMPLATE: TemplateId = "classic";

export function isTemplateId(value: unknown): value is TemplateId {
  return (
    typeof value === "string" && (TEMPLATE_IDS as readonly string[]).includes(value)
  );
}

/** Accepts anything (a query param, a stored preference) and never throws. */
export function resolveTemplate(value: unknown): ResumeTemplate {
  return TEMPLATES[isTemplateId(value) ? value : DEFAULT_TEMPLATE];
}
