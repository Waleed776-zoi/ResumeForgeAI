import pdfParse from "pdf-parse";

/**
 * Extracts plain text from a PDF file buffer.
 * Note: pdf-parse handles standard text-based PDFs well. Scanned/image-only
 * PDFs will return empty/garbled text — that's a v2 problem (OCR), not v1.
 */
export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  const data = await pdfParse(buffer);
  const text = data.text.trim();

  if (!text) {
    throw new Error(
      "Could not extract text from this PDF. If it's a scanned image, try uploading a DOCX version instead."
    );
  }

  return text;
}
