import type { ResumeJson } from "@/lib/types";

type ResumeMeta = Pick<
  ResumeJson,
  "name" | "contact" | "education" | "certifications"
>;

/**
 * Pulls the identity fields for an export out of the linked base_resumes row.
 *
 * These deliberately never come from `tailored_resume_json` — TailoredOutput
 * has no name/contact/education at all, because the tailoring model must not
 * be able to rewrite who the candidate is or where they studied.
 *
 * The fallback only fires for rows written before base_resume_id was
 * populated; those exports genuinely have no identity data to recover.
 */
export function resolveResumeMeta(application: {
  base_resumes?: { resume_json?: Partial<ResumeJson> } | null;
}): ResumeMeta {
  const base = application.base_resumes?.resume_json;

  return {
    name: base?.name?.trim() || "Candidate",
    contact: base?.contact?.trim() || "",
    education: base?.education ?? [],
    certifications: base?.certifications ?? [],
  };
}

/**
 * Builds a safe download filename. Job postings often omit the company name,
 * and the parser is instructed never to guess one — interpolating that
 * straight into the header produced "resume-null.pdf".
 */
export function exportFilename(
  application: { company?: string | null; role?: string | null },
  extension: string
): string {
  const slug = (application.company || application.role || "")
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();

  return slug ? `resume-${slug}.${extension}` : `resume.${extension}`;
}
