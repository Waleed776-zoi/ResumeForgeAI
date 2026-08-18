import {
  AlignmentType,
  BorderStyle,
  Document,
  Packer,
  Paragraph,
  TabStopType,
  TextRun,
} from "docx";
import type { TailoredOutput } from "@/lib/types";
import {
  buildResumeDocument,
  type ResumeSection,
  type ResumeMeta,
} from "./resumeModel";
import { resolveTemplate, type ResumeTemplate } from "./templates";

/**
 * DOCX export, styled from the same template spec as the PDF.
 *
 * Both read the same ResumeDocument, so they can't disagree about content,
 * and both read the same ResumeTemplate, so they can't disagree about style
 * either. This file's only job is translating a point-based spec into Word's
 * units and letting Word do the layout natively — unlike the PDF, where every
 * rule and alignment is measured by hand.
 *
 * Still single-column with no tables: recruiters routinely edit the DOCX
 * before forwarding it, and a table-based resume falls apart the moment
 * someone changes a font size.
 */

// Word measures in twips (1/20 pt) and half-points.
const twip = (points: number) => Math.round(points * 20);
const halfPt = (points: number) => Math.round(points * 2);

/**
 * Word's "single" line spacing (240) already bakes in natural leading of
 * roughly 1.2×, so a template leading of 1.34 must not be sent as 240 × 1.34
 * or the DOCX comes out visibly looser than the PDF.
 */
const lineFor = (leading: number) => Math.round((240 * leading) / 1.2);

const PAGE_WIDTH_PT = 612;
const INK = "1C2430";
const SOFT = "545C69";
const RULE = "B7B5AF";
const ACCENT = "2F5D50";

const fontFor = (t: ResumeTemplate) =>
  t.family === "serif" ? "Times New Roman" : "Arial";

const headingColor = (t: ResumeTemplate) =>
  t.headingColor === "accent" ? ACCENT : INK;

function sectionHeading(t: ResumeTemplate, text: string): Paragraph {
  return new Paragraph({
    spacing: { before: twip(t.space.beforeSection + 5), after: twip(5) },
    // The rule under a heading is a paragraph border, so it stays attached
    // to the heading if the document reflows. Word can't underline just the
    // heading's width, so "short" falls back to no rule rather than faking
    // it with a table.
    border:
      t.sectionRule === "full"
        ? {
            bottom: {
              style: BorderStyle.SINGLE,
              size: 5,
              color: RULE,
              space: 3,
            },
          }
        : undefined,
    keepNext: true,
    children: [
      new TextRun({
        text: text.toUpperCase(),
        bold: true,
        size: halfPt(t.size.section),
        font: fontFor(t),
        color: headingColor(t),
        characterSpacing: twip(t.tracking.section),
      }),
    ],
  });
}

function bullet(t: ResumeTemplate, text: string): Paragraph {
  return new Paragraph({
    bullet: { level: 0 },
    alignment: AlignmentType.JUSTIFIED,
    spacing: { after: twip(2), line: lineFor(t.leading) },
    children: [
      new TextRun({
        text,
        size: halfPt(t.size.body),
        font: fontFor(t),
        color: INK,
      }),
    ],
  });
}

/**
 * A numbered citation. Word's list numbering needs a document-level
 * numbering definition and renumbers on edit; a literal "[n]" with a hanging
 * indent is stable, matches the PDF exactly, and survives a recruiter
 * reordering paragraphs.
 */
function citation(t: ResumeTemplate, text: string, index: number): Paragraph {
  const hang = twip(18);

  return new Paragraph({
    indent: { left: hang, hanging: hang },
    alignment: AlignmentType.JUSTIFIED,
    spacing: { after: twip(4), line: lineFor(t.leading) },
    // Word's equivalent of the PDF's keep-together measurement: never split
    // a single citation across a page boundary.
    keepLines: true,
    children: [
      new TextRun({
        text: `[${index + 1}]  ${text}`,
        size: halfPt(t.size.body),
        font: fontFor(t),
        color: INK,
      }),
    ],
  });
}

function renderSection(t: ResumeTemplate, section: ResumeSection): Paragraph[] {
  const out: Paragraph[] = [sectionHeading(t, section.heading)];
  const font = fontFor(t);
  const contentWidthTwip = twip(PAGE_WIDTH_PT - t.margin * 2);

  switch (section.kind) {
    case "prose":
      out.push(
        new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          spacing: { after: twip(4), line: lineFor(t.leading) },
          children: [
            new TextRun({
              text: section.body,
              size: halfPt(t.size.body),
              font,
              color: INK,
            }),
          ],
        })
      );
      break;

    case "inline":
      out.push(
        new Paragraph({
          spacing: { after: twip(4), line: lineFor(t.leading) },
          children: [
            new TextRun({
              text: section.items.join("  ·  "),
              size: halfPt(t.size.body),
              font,
              color: INK,
            }),
          ],
        })
      );
      break;

    case "list":
      out.push(...section.items.map((item) => bullet(t, item)));
      break;

    case "numbered":
      out.push(...section.items.map((item, i) => citation(t, item, i)));
      break;

    case "experience":
      section.roles.forEach((role, i) => {
        // Title left, dates flush right on the same line via a right tab
        // stop at the content edge — the same visual result the PDF gets by
        // measuring, but declarative and reflow-safe.
        out.push(
          new Paragraph({
            spacing: {
              before: twip(i === 0 ? 0 : t.space.betweenRoles),
              after: twip(1),
            },
            tabStops: [{ type: TabStopType.RIGHT, position: contentWidthTwip }],
            keepNext: true,
            children: [
              new TextRun({
                text: role.title,
                bold: true,
                size: halfPt(t.size.role),
                font,
                color: INK,
              }),
              new TextRun({
                text: `\t${role.dates}`,
                size: halfPt(t.size.meta),
                font,
                color: SOFT,
              }),
            ],
          })
        );

        if (role.company) {
          out.push(
            new Paragraph({
              spacing: { after: twip(3) },
              keepNext: true,
              children: [
                new TextRun({
                  text: role.company,
                  italics: true,
                  size: halfPt(t.size.meta),
                  font,
                  color: SOFT,
                }),
              ],
            })
          );
        }

        out.push(...role.bullets.map((b) => bullet(t, b)));
      });
      break;
  }

  return out;
}

export async function generateResumeDocx(
  tailored: TailoredOutput,
  originalMeta: ResumeMeta,
  templateId?: string
): Promise<Buffer> {
  const t = resolveTemplate(templateId);
  const resume = buildResumeDocument(tailored, originalMeta);
  const font = fontFor(t);
  const align =
    t.headerAlign === "center" ? AlignmentType.CENTER : AlignmentType.LEFT;

  const masthead: Paragraph[] = [
    new Paragraph({
      alignment: align,
      spacing: { after: twip(3) },
      children: [
        new TextRun({
          text: t.uppercaseName ? resume.name.toUpperCase() : resume.name,
          bold: true,
          size: halfPt(t.size.name),
          font,
          color: INK,
          characterSpacing: twip(t.tracking.name),
        }),
      ],
    }),
  ];

  if (resume.contact) {
    masthead.push(
      new Paragraph({
        alignment: align,
        spacing: { after: twip(t.space.afterMasthead) },
        children: [
          new TextRun({
            text: resume.contact,
            size: halfPt(t.size.contact),
            font,
            color: SOFT,
          }),
        ],
      })
    );
  }

  const doc = new Document({
    title: `${resume.name} — Resume`,
    creator: "ResumeForge AI",
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: twip(t.margin),
              bottom: twip(t.margin),
              left: twip(t.margin),
              right: twip(t.margin),
            },
          },
        },
        children: [
          ...masthead,
          ...resume.sections.flatMap((s) => renderSection(t, s)),
        ],
      },
    ],
  });

  return Packer.toBuffer(doc);
}

/**
 * Cover letter as its own document — deliberately plainer than the resume.
 * A letter is prose, so it gets generous leading and no rules or tracking.
 */
export async function generateCoverLetterDocx(
  coverLetter: string,
  name: string,
  templateId?: string
): Promise<Buffer> {
  const t = resolveTemplate(templateId);
  const font = fontFor(t);

  const body = coverLetter
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map(
      (text) =>
        new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          spacing: { after: twip(9), line: lineFor(t.leading + 0.1) },
          children: [
            new TextRun({
              text,
              size: halfPt(t.size.body),
              font,
              color: INK,
            }),
          ],
        })
    );

  const doc = new Document({
    title: `${name} — Cover Letter`,
    creator: "ResumeForge AI",
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: twip(72),
              bottom: twip(72),
              left: twip(72),
              right: twip(72),
            },
          },
        },
        children: [
          new Paragraph({
            spacing: { after: twip(14) },
            children: [
              new TextRun({
                text: name,
                bold: true,
                size: halfPt(t.size.role),
                font,
                color: INK,
              }),
            ],
          }),
          ...body,
        ],
      },
    ],
  });

  return Packer.toBuffer(doc);
}
