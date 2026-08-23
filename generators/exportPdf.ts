import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from "pdf-lib";
import type { TailoredOutput } from "@/lib/types";
import { coverLetterBlocks, blockLines } from "@/generators/coverLetter";
import {
  buildResumeDocument,
  type ResumeSection,
  type ResumeMeta,
} from "./resumeModel";
import { resolveTemplate, type ResumeTemplate } from "./templates";

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
 * justification, letter-spacing and page breaks are implemented below. The
 * template supplies every measurement; nothing here is hard-coded to one look.
 */

const PAGE = { width: 612, height: 792 }; // US Letter

const INK = rgb(0.11, 0.14, 0.19);
const SOFT = rgb(0.35, 0.39, 0.46);
const RULE = rgb(0.72, 0.71, 0.67);
const ACCENT = rgb(0.184, 0.365, 0.314); // matches the app's forest accent

const BULLET_GLYPH = "•";
const MIN_HANG = 11;

/** Widest gap we'll stretch a justified line to before it looks broken. */
const MAX_JUSTIFY_STRETCH = 2.6;

interface Ctx {
  doc: PDFDocument;
  page: PDFPage;
  y: number;
  regular: PDFFont;
  bold: PDFFont;
  italic: PDFFont;
  t: ResumeTemplate;
  contentWidth: number;
}

const leadingOf = (ctx: Ctx, size?: number) =>
  (size ?? ctx.t.size.body) * ctx.t.leading;

function newPage(ctx: Ctx) {
  ctx.page = ctx.doc.addPage([PAGE.width, PAGE.height]);
  ctx.y = PAGE.height - ctx.t.margin;
}

/** Break to a new page if `needed` points won't fit above the bottom margin. */
function ensure(ctx: Ctx, needed: number) {
  if (ctx.y - needed < ctx.t.margin) newPage(ctx);
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
  const size = opts.size ?? ctx.t.size.body;
  const color = opts.color ?? INK;
  const x = opts.x ?? ctx.t.margin;
  const width = opts.width ?? ctx.contentWidth;
  const leading = leadingOf(ctx, size);

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

  let cursor = centered
    ? ctx.t.margin + (ctx.contentWidth - total) / 2
    : ctx.t.margin;

  for (const char of chars) {
    ctx.page.drawText(char, { x: cursor, y: ctx.y, size, font, color });
    cursor += widthOf(font, char, size) + tracking;
  }

  return total;
}

function drawSectionHeading(ctx: Ctx, heading: string) {
  const { t } = ctx;
  // Keep the heading with at least its first line of content.
  ensure(ctx, leadingOf(ctx, t.size.section) + 26);
  ctx.y -= t.space.beforeSection;

  const width = drawTracked(ctx, heading.toUpperCase(), {
    font: ctx.bold,
    size: t.size.section,
    color: t.headingColor === "accent" ? ACCENT : INK,
    tracking: t.tracking.section,
  });

  // Descend past the heading's own baseline BEFORE anything else. This used
  // to sit inside the rule branch, so unruled templates dropped only
  // `afterRule` and their headings overprinted the first line of content.
  ctx.y -= 5;

  if (t.sectionRule !== "none") {
    ctx.page.drawLine({
      start: { x: t.margin, y: ctx.y },
      end: {
        x: t.margin + (t.sectionRule === "short" ? width : ctx.contentWidth),
        y: ctx.y,
      },
      thickness: 0.6,
      color: RULE,
    });
  }

  ctx.y -= t.space.afterRule;
}

/** Title on the left, dates flush right, sharing one baseline. */
function drawRoleLine(ctx: Ctx, title: string, dates: string) {
  const leading = leadingOf(ctx, ctx.t.size.role);
  ensure(ctx, leading * 2);

  ctx.page.drawText(title, {
    x: ctx.t.margin,
    y: ctx.y,
    size: ctx.t.size.role,
    font: ctx.bold,
    color: INK,
  });

  if (dates) {
    const w = widthOf(ctx.regular, dates, ctx.t.size.meta);
    ctx.page.drawText(dates, {
      x: ctx.t.margin + ctx.contentWidth - w,
      y: ctx.y,
      size: ctx.t.size.meta,
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
  const leading = leadingOf(ctx);
  const indent = Math.max(
    MIN_HANG,
    widthOf(ctx.regular, marker, ctx.t.size.body) + 5
  );

  // A citation is one unit of meaning — splitting "IEEE Xplore, ICETECC,
  // Apr 2025" onto the next page reads as a second, broken entry. Measure
  // the whole item first and move it wholesale if it won't fit.
  const needed = keepTogether
    ? wrap(ctx.regular, text, ctx.t.size.body, ctx.contentWidth - indent)
        .length * leading
    : leading;

  ensure(ctx, needed);

  ctx.page.drawText(marker, {
    x: ctx.t.margin + 2,
    y: ctx.y,
    size: ctx.t.size.body,
    font: ctx.regular,
    color: SOFT,
  });

  // Hanging indent: wrapped lines align under the first character of the
  // text, not back under the marker.
  drawParagraph(ctx, text, {
    x: ctx.t.margin + indent,
    width: ctx.contentWidth - indent,
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
        if (i > 0) ctx.y -= ctx.t.space.betweenRoles;
        drawRoleLine(ctx, role.title, role.dates);

        if (role.company) {
          drawParagraph(ctx, role.company, {
            font: ctx.italic,
            size: ctx.t.size.meta,
            color: SOFT,
          });
        }

        ctx.y -= 2;
        for (const bullet of role.bullets) drawBullet(ctx, bullet);
      });
      break;
  }

  ctx.y -= ctx.t.space.afterSection;
}

/**
 * Name and contact line, in the template's header style.
 *
 * Shared by both documents on purpose: a cover letter that mastheads
 * differently from the resume it accompanies looks like it came from
 * somewhere else, which is the opposite of what a letterhead is for.
 */
function drawMasthead(ctx: Ctx, name: string, contact: string) {
  const t = ctx.t;
  const centred = t.headerAlign === "center";

  ctx.y -= t.size.name;
  drawTracked(
    ctx,
    t.uppercaseName ? name.toUpperCase() : name,
    { font: ctx.bold, size: t.size.name, color: INK, tracking: t.tracking.name },
    centred
  );
  ctx.y -= leadingOf(ctx, t.size.contact) + 4;

  if (contact) {
    for (const words of wrap(
      ctx.regular,
      contact,
      t.size.contact,
      ctx.contentWidth
    )) {
      const line = words.join(" ");
      const w = widthOf(ctx.regular, line, t.size.contact);
      ctx.page.drawText(line, {
        x: centred ? t.margin + (ctx.contentWidth - w) / 2 : t.margin,
        y: ctx.y,
        size: t.size.contact,
        font: ctx.regular,
        color: SOFT,
      });
      ctx.y -= leadingOf(ctx, t.size.contact);
    }
  }

  ctx.y -= t.space.afterMasthead;
}

/** Builds the drawing context and embeds the template's three faces. */
async function createContext(doc: PDFDocument, templateId?: string) {
  const t = resolveTemplate(templateId);
  const serif = t.family === "serif";

  const ctx: Ctx = {
    doc,
    page: doc.addPage([PAGE.width, PAGE.height]),
    y: PAGE.height - t.margin,
    regular: await doc.embedFont(
      serif ? StandardFonts.TimesRoman : StandardFonts.Helvetica
    ),
    bold: await doc.embedFont(
      serif ? StandardFonts.TimesRomanBold : StandardFonts.HelveticaBold
    ),
    italic: await doc.embedFont(
      serif ? StandardFonts.TimesRomanItalic : StandardFonts.HelveticaOblique
    ),
    t,
    contentWidth: PAGE.width - t.margin * 2,
  };

  return ctx;
}

export async function generateResumePdf(
  tailored: TailoredOutput,
  originalMeta: ResumeMeta,
  templateId?: string
): Promise<Buffer> {
  const resume = buildResumeDocument(tailored, originalMeta);
  const doc = await PDFDocument.create();
  const ctx = await createContext(doc, templateId);

  doc.setTitle(`${resume.name} — Resume`);
  doc.setAuthor(resume.name);
  doc.setProducer("ResumeForge AI");

  drawMasthead(ctx, resume.name, resume.contact);

  for (const section of resume.sections) drawSection(ctx, section);

  return Buffer.from(await doc.save());
}

/**
 * Cover letter as its own document — deliberately plainer than the resume.
 *
 * A letter is prose: no rules, no tracked headings, no dense two-column role
 * lines. It gets the resume's letterhead so the pair reads as one submission,
 * slightly looser leading because uninterrupted prose needs it, and nothing
 * else. There is also no date line — a letter downloaded today and sent next
 * week would be dated wrong, and no date is more correct than a stale one.
 */
export async function generateCoverLetterPdf(
  coverLetter: string,
  meta: ResumeMeta,
  templateId?: string
): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const ctx = await createContext(doc, templateId);
  const t = ctx.t;

  const name = meta.name?.trim() || "Candidate";
  const contact = meta.contact?.trim() ?? "";

  doc.setTitle(`${name} — Cover Letter`);
  doc.setAuthor(name);
  doc.setProducer("ResumeForge AI");

  drawMasthead(ctx, name, contact);

  const blocks = coverLetterBlocks(coverLetter);

  blocks.forEach((block, i) => {
    for (const line of blockLines(block)) {
      drawParagraph(ctx, line, {
        size: t.size.body,
        // Prose is justified like the resume's summary; a stacked block —
        // salutation, sign-off — never is. Stretching "Sincerely," across
        // the measure is the loudest possible tell that nobody read it.
        justify: block.prose,
      });
    }

    if (i < blocks.length - 1) ctx.y -= t.size.body * 0.75;
  });

  return Buffer.from(await doc.save());
}
