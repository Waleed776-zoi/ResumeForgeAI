import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { TailoredOutput, ResumeJson } from "@/lib/types";

/**
 * v1 PDF export: clean, single-column, text-based layout using pdf-lib.
 * This is intentionally simple — a proper multi-template PDF layout
 * (matching the DOCX styling exactly) is a v1.1/v2 improvement. For now
 * this produces a legible, submittable one-page-flow resume.
 */
export async function generateResumePdf(
  tailored: TailoredOutput,
  originalMeta: Pick<ResumeJson, "name" | "contact" | "education" | "certifications">
): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  let page = pdfDoc.addPage([612, 792]); // US Letter
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const margin = 54;
  const maxWidth = 612 - margin * 2;
  let y = 792 - margin;

  function newPageIfNeeded(lineHeight: number) {
    if (y < margin + lineHeight) {
      page = pdfDoc.addPage([612, 792]);
      y = 792 - margin;
    }
  }

  function drawText(
    text: string,
    { size = 10, bold = false, color = rgb(0.11, 0.14, 0.19) } = {}
  ) {
    const usedFont = bold ? boldFont : font;
    const words = text.split(" ");
    let line = "";

    for (const word of words) {
      const testLine = line ? `${line} ${word}` : word;
      const width = usedFont.widthOfTextAtSize(testLine, size);
      if (width > maxWidth && line) {
        newPageIfNeeded(size + 4);
        page.drawText(line, { x: margin, y, size, font: usedFont, color });
        y -= size + 4;
        line = word;
      } else {
        line = testLine;
      }
    }
    if (line) {
      newPageIfNeeded(size + 4);
      page.drawText(line, { x: margin, y, size, font: usedFont, color });
      y -= size + 4;
    }
  }

  drawText(originalMeta.name, { size: 18, bold: true });
  drawText(originalMeta.contact, { size: 9, color: rgb(0.4, 0.44, 0.5) });
  y -= 10;

  drawText("SUMMARY", { size: 11, bold: true });
  drawText(tailored.summary);
  y -= 10;

  drawText("SKILLS", { size: 11, bold: true });
  drawText(tailored.skills.join(" · "));
  y -= 10;

  drawText("EXPERIENCE", { size: 11, bold: true });
  for (const exp of tailored.experience) {
    drawText(`${exp.title} — ${exp.company}`, { bold: true });
    drawText(exp.dates, { size: 9, color: rgb(0.4, 0.44, 0.5) });
    for (const bullet of exp.bullets) {
      drawText(`• ${bullet}`);
    }
    y -= 6;
  }

  if (originalMeta.education.length > 0) {
    drawText("EDUCATION", { size: 11, bold: true });
    for (const e of originalMeta.education) drawText(e);
  }

  // Kept in step with the DOCX exporter — the two must not disagree about
  // what a resume contains.
  if (originalMeta.certifications.length > 0) {
    y -= 10;
    drawText("CERTIFICATIONS", { size: 11, bold: true });
    for (const c of originalMeta.certifications) drawText(c);
  }

  const bytes = await pdfDoc.save();
  return Buffer.from(bytes);
}
