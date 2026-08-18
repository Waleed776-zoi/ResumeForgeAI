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

/**
 * DOCX export, styled to match the PDF.
 *
 * Both read the same ResumeDocument, so they can't disagree about content;
 * this file only decides how Word should draw it. Unlike the PDF — where
 * every rule and alignment is computed by hand — Word has native tab stops,
 * paragraph borders and justification, so the layout is declared rather than
 * measured.
 *
 * Still single-column with no tables: recruiters routinely edit the DOCX
 * before forwarding it, and a table-based resume falls apart the moment
 * someone changes a font size.
 */

// Word measures in twips (1/20 pt) and half-points. Named here so the
// numbers below read as design decisions rather than magic.
const twip = (points: number) => Math.round(points * 20);
const halfPt = (points: number) => Math.round(points * 2);

const MARGIN_PT = 56;
const CONTENT_WIDTH_TWIP = twip(612 - MARGIN_PT * 2);

const FONT = "Times New Roman";
const INK = "1C2430";
const SOFT = "545C69";
const RULE = "B7B5AF";

const SIZE = {
  name: halfPt(19),
  contact: halfPt(9),
  section: halfPt(9.6),
  role: halfPt(10.2),
  meta: halfPt(9),
  body: halfPt(9.6),
};

function sectionHeading(text: string): Paragraph {
  return new Paragraph({
    spacing: { before: twip(11), after: twip(5) },
    // The rule under a heading is a paragraph border, so it stays attached
    // to the heading if the document reflows.
    border: {
      bottom: { style: BorderStyle.SINGLE, size: 5, color: RULE, space: 3 },
    },
    keepNext: true,
    children: [
      new TextRun({
        text: text.toUpperCase(),
        bold: true,
        size: SIZE.section,
        font: FONT,
        color: INK,
        characterSpacing: twip(1.1),
      }),
    ],
  });
}

function bullet(text: string): Paragraph {
  return new Paragraph({
    bullet: { level: 0 },
    alignment: AlignmentType.JUSTIFIED,
    spacing: { after: twip(2), line: 276 }, // 1.15 line spacing
    children: [
      new TextRun({ text, size: SIZE.body, font: FONT, color: INK }),
    ],
  });
}

/**
 * A numbered citation. Word's list numbering needs a document-level
 * numbering definition and renumbers on edit; a literal "[n]" with a hanging
 * indent is stable, matches the PDF exactly, and survives a recruiter
 * reordering paragraphs.
 */
function citation(text: string, index: number): Paragraph {
  const hang = twip(18);

  return new Paragraph({
    indent: { left: hang, hanging: hang },
    alignment: AlignmentType.JUSTIFIED,
    spacing: { after: twip(4), line: 276 },
    // Word's equivalent of the PDF's keep-together measurement: never split
    // a single citation across a page boundary.
    keepLines: true,
    children: [
      new TextRun({
        text: `[${index + 1}]  ${text}`,
        size: SIZE.body,
        font: FONT,
        color: INK,
      }),
    ],
  });
}

function renderSection(section: ResumeSection): Paragraph[] {
  const out: Paragraph[] = [sectionHeading(section.heading)];

  switch (section.kind) {
    case "prose":
      out.push(
        new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          spacing: { after: twip(4), line: 276 },
          children: [
            new TextRun({
              text: section.body,
              size: SIZE.body,
              font: FONT,
              color: INK,
            }),
          ],
        })
      );
      break;

    case "inline":
      out.push(
        new Paragraph({
          spacing: { after: twip(4), line: 276 },
          children: [
            new TextRun({
              text: section.items.join("  ·  "),
              size: SIZE.body,
              font: FONT,
              color: INK,
            }),
          ],
        })
      );
      break;

    case "list":
      out.push(...section.items.map(bullet));
      break;

    case "numbered":
      out.push(...section.items.map(citation));
      break;

    case "experience":
      section.roles.forEach((role, i) => {
        // Title left, dates flush right on the same line via a right tab
        // stop at the content edge — the same visual result the PDF gets by
        // measuring, but declarative and reflow-safe.
        out.push(
          new Paragraph({
            spacing: { before: twip(i === 0 ? 0 : 8), after: twip(1) },
            tabStops: [
              { type: TabStopType.RIGHT, position: CONTENT_WIDTH_TWIP },
            ],
            keepNext: true,
            children: [
              new TextRun({
                text: role.title,
                bold: true,
                size: SIZE.role,
                font: FONT,
                color: INK,
              }),
              new TextRun({
                text: `\t${role.dates}`,
                size: SIZE.meta,
                font: FONT,
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
                  size: SIZE.meta,
                  font: FONT,
                  color: SOFT,
                }),
              ],
            })
          );
        }

        out.push(...role.bullets.map(bullet));
      });
      break;
  }

  return out;
}

export async function generateResumeDocx(
  tailored: TailoredOutput,
  originalMeta: ResumeMeta
): Promise<Buffer> {
  const resume = buildResumeDocument(tailored, originalMeta);

  const masthead: Paragraph[] = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: twip(3) },
      children: [
        new TextRun({
          text: resume.name.toUpperCase(),
          bold: true,
          size: SIZE.name,
          font: FONT,
          color: INK,
          characterSpacing: twip(1.6),
        }),
      ],
    }),
  ];

  if (resume.contact) {
    masthead.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: twip(6) },
        children: [
          new TextRun({
            text: resume.contact,
            size: SIZE.contact,
            font: FONT,
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
              top: twip(MARGIN_PT),
              bottom: twip(MARGIN_PT),
              left: twip(MARGIN_PT),
              right: twip(MARGIN_PT),
            },
          },
        },
        children: [
          ...masthead,
          ...resume.sections.flatMap(renderSection),
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
  name: string
): Promise<Buffer> {
  const body = coverLetter
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map(
      (text) =>
        new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          spacing: { after: twip(9), line: 300 },
          children: [
            new TextRun({ text, size: SIZE.body, font: FONT, color: INK }),
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
                size: SIZE.role,
                font: FONT,
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
