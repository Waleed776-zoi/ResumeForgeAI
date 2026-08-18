import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from "pdf-lib";
import type { TailoredOutput } from "@/lib/types";
import {
  buildResumeDocument,
  type ResumeSection,
  type ResumeMeta,
} from "./resumeModel";

/**
 * Typeset resume export.
 *
 * Deliberately single-column, real-text, standard-font: no tables, no text
 * boxes, no graphics. Resume parsers read PDFs by pulling the text stream in
 * layout order, and multi-column or table-based designs are the single most
 * common reason a resume arrives at a recruiter scrambled. Everything here is
 * typographic — rules, spacing, weight and alignment — so it stays legible to
 * both a person and a machine.
 *
 * pdf-lib gives us primitives, not a layout engine, so word wrapping,
 * justification, letter-spacing and page breaks are implemented below.
 */

const PAGE = { width: 612, height: 792 }; // US Letter
const MARGIN = 56;
const CONTENT_WIDTH = PAGE.width - MARGIN * 2;

const SIZE = {
  name: 19,
  contact: 8.8,
  section: 9.6,
  role: 10.2,
  meta: 8.8,
  body: 9.6,
};

const LEADING = 1.34; // multiple of font size
const INK = rgb(0.11, 0.14, 0.19);
const SOFT = rgb(0.35, 0.39, 0.46);
const RULE = rgb(0.72, 0.71, 0.67);

const BULLET_INDENT = 11;
const BULLET_GLYPH = "•";

/** Widest gap we'll stretch a justified line to before it looks broken. */
const MAX_JUSTIFY_STRETCH = 2.6;

interface Ctx {
  doc: PDFDocument;
  page: PDFPage;
  y: number;
  regular: PDFFont;
  bold: PDFFont;
  italic: PDFFont;
}

function newPage(ctx: Ctx) {
  ctx.page = ctx.doc.addPage([PAGE.width, PAGE.height]);
  ctx.y = PAGE.height - MARGIN;
}

/** Break to a new page if `needed` points won't fit above the bottom margin. */
function ensure(ctx: Ctx, needed: number) {
  if (ctx.y - needed < MARGIN) newPage(ctx);
}

function widthOf(font: PDFFont, text: string, size: number) {
  return font.widthOfTextAtSize(text, size);
}

/** Greedy wrap into lines that fit `width`. */
function wrap(
  font: PDFFont,
  text: string,
  size: number,
  width: number
): string[][] {
  const lines: string[][] = [];
  let line: string[] = [];

  for (const word of text.split(/\s+/).filter(Boolean)) {
    const candidate = [...line, word].join(" ");
    if (line.length && widthOf(font, candidate, size) > width) {
      lines.push(line);
      line = [word];
    } else {
      line.push(word);
    }
  }
  if (line.length) lines.push(line);

  return lines;
}

/**
 * Draws one line, optionally justified.
 *
 * pdf-lib has no word-spacing control, so justification means placing each
 * word at its own computed x. Lines that would need absurd gaps (a two-word
 * line ending a paragraph, say) are left ragged instead — stretched-out
 * whitespace looks far worse than an uneven right edge.
 */
function drawLine(
  ctx: Ctx,
  words: string[],
  opts: {
    x: number;
    width: number;
    font: PDFFont;
    size: number;
    color: typeof INK;
    justify: boolean;
  }
) {
  const { x, width, font, size, color, justify } = opts;
  const text = words.join(" ");

  if (!justify || words.length < 2) {
    ctx.page.drawText(text, { x, y: ctx.y, size, font, color });
    return;
  }

  const wordsWidth = words.reduce((sum, w) => sum + widthOf(font, w, size), 0);
  const gap = (width - wordsWidth) / (words.length - 1);
  const spaceWidth = widthOf(font, " ", size);

  if (gap > spaceWidth * MAX_JUSTIFY_STRETCH) {
    ctx.page.drawText(text, { x, y: ctx.y, size, font, color });
    return;
  }

  let cursor = x;
  for (const word of words) {
    ctx.page.drawText(word, { x: cursor, y: ctx.y, size, font, color });
    cursor += widthOf(font, word, size) + gap;
  }
}

interface ParagraphOpts {
  font?: PDFFont;
  size?: number;
  color?: typeof INK;
  x?: number;
  width?: number;
  justify?: boolean;
}

function drawParagraph(ctx: Ctx, text: string, opts: ParagraphOpts = {}) {
  const font = opts.font ?? ctx.regular;
  const size = opts.size ?? SIZE.body;
  const color = opts.color ?? INK;
  const x = opts.x ?? MARGIN;
  const width = opts.width ?? CONTENT_WIDTH;
  const leading = size * LEADING;

  const lines = wrap(font, text, size, width);

  lines.forEach((words, i) => {
    ensure(ctx, leading);
    // Never justify the last line of a paragraph — that's what makes
    // justified text read as typeset rather than stretched.
    drawLine(ctx, words, {
      x,
      width,
      font,
      size,
      color,
      justify: Boolean(opts.justify) && i < lines.length - 1,
    });
    ctx.y -= leading;
  });
}

/** Letter-spaced text, drawn glyph by glyph — pdf-lib has no tracking option. */
function drawTracked(
  ctx: Ctx,
  text: string,
  opts: { font: PDFFont; size: number; color: typeof INK; tracking: number },
  centered = false
) {
  const { font, size, color, tracking } = opts;
  const chars = [...text];
  const total =
    chars.reduce((sum, c) => sum + widthOf(font, c, size), 0) +
    tracking * Math.max(0, chars.length - 1);

  let cursor = centered ? MARGIN + (CONTENT_WIDTH - total) / 2 : MARGIN;

  for (const char of chars) {
    ctx.page.drawText(char, { x: cursor, y: ctx.y, size, font, color });
    cursor += widthOf(font, char, size) + tracking;
  }

  return total;
}

/** Section heading in tracked small caps, underscored by a hairline rule. */
function drawSectionHeading(ctx: Ctx, heading: string) {
  // Keep the heading with at least its first line of content.
  ensure(ctx, SIZE.section * LEADING + 26);
  ctx.y -= 6;

  drawTracked(ctx, heading.toUpperCase(), {
    font: ctx.bold,
    size: SIZE.section,
    color: INK,
    tracking: 1.1,
  });

  ctx.y -= 5;
  ctx.page.drawLine({
    start: { x: MARGIN, y: ctx.y },
    end: { x: MARGIN + CONTENT_WIDTH, y: ctx.y },
    thickness: 0.6,
    color: RULE,
  });
  ctx.y -= 11;
}

/** Title on the left, dates flush right, sharing one baseline. */
function drawRoleLine(ctx: Ctx, title: string, dates: string) {
  const leading = SIZE.role * LEADING;
  ensure(ctx, leading * 2);

  ctx.page.drawText(title, {
    x: MARGIN,
    y: ctx.y,
    size: SIZE.role,
    font: ctx.bold,
    color: INK,
  });

  if (dates) {
    const w = widthOf(ctx.regular, dates, SIZE.meta);
    ctx.page.drawText(dates, {
      x: MARGIN + CONTENT_WIDTH - w,
      y: ctx.y,
      size: SIZE.meta,
      font: ctx.regular,
      color: SOFT,
    });
  }

  ctx.y -= leading;
}

/**
 * A marker in the left gutter with text hanging beside it. Used for bullets
 * and for numbered citations — the indent follows the marker's own width, so
 * "[10]" lines up as cleanly as "•".
 */
function drawMarkedItem(
  ctx: Ctx,
  marker: string,
  text: string,
  keepTogether = false
) {
  const leading = SIZE.body * LEADING;

  const indent = Math.max(
    BULLET_INDENT,
    widthOf(ctx.regular, marker, SIZE.body) + 5
  );

  // A citation is one unit of meaning — splitting "IEEE Xplore, ICETECC,
  // Apr 2025" onto the next page reads as a second, broken entry. Measure
  // the whole item first and move it wholesale if it won't fit.
  const needed = keepTogether
    ? wrap(ctx.regular, text, SIZE.body, CONTENT_WIDTH - indent).length * leading
    : leading;

  ensure(ctx, needed);

  ctx.page.drawText(marker, {
    x: MARGIN + 2,
    y: ctx.y,
    size: SIZE.body,
    font: ctx.regular,
    color: SOFT,
  });

  // Hanging indent: wrapped lines align under the first character of the
  // text, not back under the marker.
  drawParagraph(ctx, text, {
    x: MARGIN + indent,
    width: CONTENT_WIDTH - indent,
    justify: true,
  });
}

const drawBullet = (ctx: Ctx, text: string) =>
  drawMarkedItem(ctx, BULLET_GLYPH, text);

function drawSection(ctx: Ctx, section: ResumeSection) {
  drawSectionHeading(ctx, section.heading);

  switch (section.kind) {
    case "prose":
      drawParagraph(ctx, section.body, { justify: true });
      break;

    case "inline":
      drawParagraph(ctx, section.items.join("  ·  "), { justify: false });
      break;

    case "list":
      for (const item of section.items) drawBullet(ctx, item);
      break;

    case "numbered":
      section.items.forEach((item, i) => {
        if (i > 0) ctx.y -= 3;
        drawMarkedItem(ctx, `[${i + 1}]`, item, true);
      });
      break;

    case "experience":
      section.roles.forEach((role, i) => {
        if (i > 0) ctx.y -= 7;
        drawRoleLine(ctx, role.title, role.dates);

        if (role.company) {
          drawParagraph(ctx, role.company, {
            font: ctx.italic,
            size: SIZE.meta,
            color: SOFT,
          });
        }

        ctx.y -= 2;
        for (const bullet of role.bullets) drawBullet(ctx, bullet);
      });
      break;
  }

  ctx.y -= 6;
}

export async function generateResumePdf(
  tailored: TailoredOutput,
  originalMeta: ResumeMeta
): Promise<Buffer> {
  const resume = buildResumeDocument(tailored, originalMeta);
  const doc = await PDFDocument.create();

  const ctx: Ctx = {
    doc,
    page: doc.addPage([PAGE.width, PAGE.height]),
    y: PAGE.height - MARGIN,
    regular: await doc.embedFont(StandardFonts.TimesRoman),
    bold: await doc.embedFont(StandardFonts.TimesRomanBold),
    italic: await doc.embedFont(StandardFonts.TimesRomanItalic),
  };

  doc.setTitle(`${resume.name} — Resume`);
  doc.setAuthor(resume.name);
  doc.setProducer("ResumeForge AI");

  // --- Masthead: name and contact, centred ---
  ctx.y -= SIZE.name;
  drawTracked(
    ctx,
    resume.name.toUpperCase(),
    { font: ctx.bold, size: SIZE.name, color: INK, tracking: 1.6 },
    true
  );
  ctx.y -= SIZE.contact * LEADING + 4;

  if (resume.contact) {
    for (const words of wrap(
      ctx.regular,
      resume.contact,
      SIZE.contact,
      CONTENT_WIDTH
    )) {
      const line = words.join(" ");
      const w = widthOf(ctx.regular, line, SIZE.contact);
      ctx.page.drawText(line, {
        x: MARGIN + (CONTENT_WIDTH - w) / 2,
        y: ctx.y,
        size: SIZE.contact,
        font: ctx.regular,
        color: SOFT,
      });
      ctx.y -= SIZE.contact * LEADING;
    }
  }

  ctx.y -= 6;

  for (const section of resume.sections) drawSection(ctx, section);

  return Buffer.from(await doc.save());
}
