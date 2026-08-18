import type { TailoredOutput, ResumeJson } from "@/lib/types";

/**
 * A renderer-agnostic description of the finished resume.
 *
 * Both exporters build one of these and then only decide how to *draw* it.
 * That separation exists because the two used to disagree about content —
 * the DOCX printed a Certifications section the PDF silently dropped. Deciding
 * "which sections exist, in what order, with what content" exactly once makes
 * that class of bug impossible; the exporters can now only differ in styling.
 */

export interface ExperienceRole {
  title: string;
  company: string;
  dates: string;
  bullets: string[];
}

export type ResumeSection =
  | { kind: "prose"; heading: string; body: string }
  | { kind: "inline"; heading: string; items: string[] }
  | { kind: "experience"; heading: string; roles: ExperienceRole[] }
  | { kind: "list"; heading: string; items: string[] }
  // Citations get [1], [2] markers rather than bullets — academic convention,
  // and it lets a reader reference a specific paper in conversation.
  | { kind: "numbered"; heading: string; items: string[] };

export interface ResumeDocument {
  name: string;
  contact: string;
  sections: ResumeSection[];
}

export type ResumeMeta = Pick<
  ResumeJson,
  "name" | "contact" | "education" | "certifications"
> &
  // Optional so rows written before publications were parsed still render.
  Partial<Pick<ResumeJson, "publications">>;

const clean = (value: string) => value.trim();
const nonEmpty = (values: string[] | undefined) =>
  (values ?? []).map(clean).filter(Boolean);

export function buildResumeDocument(
  tailored: TailoredOutput,
  meta: ResumeMeta
): ResumeDocument {
  const sections: ResumeSection[] = [];

  // Every section is omitted entirely when empty, rather than printing a
  // heading with nothing under it.
  if (clean(tailored.summary ?? "")) {
    sections.push({
      kind: "prose",
      heading: "Summary",
      body: clean(tailored.summary),
    });
  }

  const skills = nonEmpty(tailored.skills);
  if (skills.length) {
    sections.push({ kind: "inline", heading: "Skills", items: skills });
  }

  const roles: ExperienceRole[] = (tailored.experience ?? [])
    .map((exp) => ({
      title: clean(exp.title ?? ""),
      company: clean(exp.company ?? ""),
      dates: clean(exp.dates ?? ""),
      bullets: nonEmpty(exp.bullets),
    }))
    .filter((role) => role.title || role.company || role.bullets.length);

  if (roles.length) {
    sections.push({ kind: "experience", heading: "Experience", roles });
  }

  const education = nonEmpty(meta.education);
  if (education.length) {
    sections.push({ kind: "list", heading: "Education", items: education });
  }

  // Publications sit above certifications deliberately: for a research role
  // a peer-reviewed paper outranks a course certificate, and the stronger
  // credential should be the one a skimming reader reaches first.
  const publications = nonEmpty(meta.publications);
  if (publications.length) {
    sections.push({
      kind: "numbered",
      heading: "Publications",
      items: publications,
    });
  }

  const certifications = nonEmpty(meta.certifications);
  if (certifications.length) {
    sections.push({
      kind: "list",
      heading: "Certifications & Awards",
      items: certifications,
    });
  }

  return {
    name: clean(meta.name) || "Candidate",
    contact: clean(meta.contact),
    sections,
  };
}
