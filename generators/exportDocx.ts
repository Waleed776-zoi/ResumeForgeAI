import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
} from "docx";
import type { TailoredOutput, ResumeJson } from "@/lib/types";

/**
 * Builds a downloadable DOCX buffer from the tailored resume JSON.
 * Kept deliberately simple for v1 — one clean template. Multiple
 * templates is a v2 feature (see roadmap).
 */
export async function generateResumeDocx(
  tailored: TailoredOutput,
  originalMeta: Pick<ResumeJson, "name" | "contact" | "education" | "certifications">
): Promise<Buffer> {
  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            text: originalMeta.name,
            heading: HeadingLevel.TITLE,
          }),
          new Paragraph({
            children: [new TextRun({ text: originalMeta.contact, italics: true })],
          }),
          new Paragraph({ text: "" }),

          new Paragraph({ text: "Summary", heading: HeadingLevel.HEADING_1 }),
          new Paragraph({ text: tailored.summary }),
          new Paragraph({ text: "" }),

          new Paragraph({ text: "Skills", heading: HeadingLevel.HEADING_1 }),
          new Paragraph({ text: tailored.skills.join(" · ") }),
          new Paragraph({ text: "" }),

          new Paragraph({ text: "Experience", heading: HeadingLevel.HEADING_1 }),
          ...tailored.experience.flatMap((exp) => [
            new Paragraph({
              children: [
                new TextRun({ text: `${exp.title} — ${exp.company}`, bold: true }),
              ],
            }),
            new Paragraph({
              children: [new TextRun({ text: exp.dates, italics: true })],
            }),
            ...exp.bullets.map(
              (bullet) =>
                new Paragraph({
                  text: bullet,
                  bullet: { level: 0 },
                })
            ),
            new Paragraph({ text: "" }),
          ]),

          new Paragraph({ text: "Education", heading: HeadingLevel.HEADING_1 }),
          ...originalMeta.education.map((e) => new Paragraph({ text: e })),

          ...(originalMeta.certifications.length > 0
            ? [
                new Paragraph({ text: "" }),
                new Paragraph({
                  text: "Certifications",
                  heading: HeadingLevel.HEADING_1,
                }),
                ...originalMeta.certifications.map(
                  (c) => new Paragraph({ text: c })
                ),
              ]
            : []),
        ],
      },
    ],
  });

  return Packer.toBuffer(doc);
}

/**
 * Builds a simple cover letter DOCX.
 */
export async function generateCoverLetterDocx(
  coverLetter: string,
  name: string
): Promise<Buffer> {
  const paragraphs = coverLetter
    .split("\n\n")
    .map((p) => new Paragraph({ text: p }));

  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({ text: name, heading: HeadingLevel.HEADING_2 }),
          new Paragraph({ text: "" }),
          ...paragraphs,
        ],
      },
    ],
  });

  return Packer.toBuffer(doc);
}
