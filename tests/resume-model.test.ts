import { describe, it, expect } from "vitest";
import { buildResumeDocument } from "../generators/resumeModel";
import type { TailoredOutput, ResumeJson } from "../lib/types";

const tailored: TailoredOutput = {
  summary: "A summary.",
  skills: ["Python", "PyTorch"],
  experience: [
    {
      title: "Researcher",
      company: "NUST",
      dates: "2023 – 2025",
      bullets: ["Did the work.", "Did more work."],
    },
  ],
  cover_letter: "Dear team,",
};

const CITATION =
  'Ayub, S., I.A. Shah, Z. Mashar, M.W. Khan, "Enhanced Signature Recognition and Fraud Detection with Deep Learning," IEEE Xplore, ICETECC, Apr 2025. [DOI: 10.1109/icetecc65365.2025.11070295]';

const meta: Pick<
  ResumeJson,
  "name" | "contact" | "education" | "certifications" | "publications"
> = {
  name: "Muhammad Waleed Khan",
  contact: "engr.waleed@example.com",
  education: ["MS CSE — NUST"],
  certifications: ["AWS Certified Solutions Architect"],
  publications: [CITATION],
};

const headings = (doc: ReturnType<typeof buildResumeDocument>) =>
  doc.sections.map((s) => s.heading);

describe("buildResumeDocument", () => {
  it("emits every section in resume order", () => {
    expect(headings(buildResumeDocument(tailored, meta))).toEqual([
      "Summary",
      "Skills",
      "Experience",
      "Education",
      "Publications",
      "Certifications & Awards",
    ]);
  });

  it("renders publications as numbered citations, byte for byte", () => {
    // A citation is a factual record: authors, venue, date and DOI must
    // survive the pipeline completely unaltered.
    const doc = buildResumeDocument(tailored, meta);
    const publications = doc.sections.find((s) => s.heading === "Publications");

    expect(publications).toMatchObject({
      kind: "numbered",
      items: [CITATION],
    });
  });

  it("still renders for resumes parsed before publications existed", () => {
    const { publications: _omitted, ...legacy } = meta;
    const doc = buildResumeDocument(tailored, legacy);

    expect(headings(doc)).not.toContain("Publications");
    expect(headings(doc)).toContain("Certifications & Awards");
  });

  it("includes certifications", () => {
    // Regression: the PDF exporter used to render Education and silently
    // drop Certifications, while the DOCX rendered both. Deciding sections
    // here — once, for both renderers — is what prevents that recurring.
    const doc = buildResumeDocument(tailored, meta);
    const certs = doc.sections.find(
      (s) => s.heading === "Certifications & Awards"
    );
    expect(certs).toBeDefined();
    expect(certs).toMatchObject({
      kind: "list",
      items: ["AWS Certified Solutions Architect"],
    });
  });

  it("omits empty sections rather than printing a bare heading", () => {
    const doc = buildResumeDocument(
      { ...tailored, summary: "  ", skills: [] },
      { ...meta, education: [], certifications: ["  "], publications: [] }
    );
    expect(headings(doc)).toEqual(["Experience"]);
  });

  it("drops blank bullets and whitespace-only entries", () => {
    const doc = buildResumeDocument(
      {
        ...tailored,
        experience: [
          {
            title: "Researcher",
            company: "NUST",
            dates: "2023",
            bullets: ["Real bullet.", "   ", ""],
          },
        ],
      },
      meta
    );

    const experience = doc.sections.find((s) => s.kind === "experience");
    expect(experience).toMatchObject({
      roles: [{ bullets: ["Real bullet."] }],
    });
  });

  it("falls back to a placeholder name but never invents contact details", () => {
    const doc = buildResumeDocument(tailored, {
      ...meta,
      name: "",
      contact: "",
    });
    expect(doc.name).toBe("Candidate");
    expect(doc.contact).toBe("");
  });
});
