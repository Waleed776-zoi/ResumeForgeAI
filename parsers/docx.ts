import mammoth from "mammoth";

/**
 * Extracts plain text from a DOCX file buffer using mammoth.
 * mammoth is intentionally used here instead of a raw XML parser — it
 * handles the messy real-world formatting variance in resumes far better.
 */
export async function extractTextFromDocx(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  const text = result.value.trim();

  if (!text) {
    throw new Error("Could not extract text from this DOCX file.");
  }

  return text;
}

/**
 * Routes a file to the right parser based on its extension/mime type.
 */
export async function extractText(
  buffer: Buffer,
  filename: string
): Promise<string> {
  const ext = filename.toLowerCase().split(".").pop();

  if (ext === "docx") {
    return extractTextFromDocx(buffer);
  }

  if (ext === "pdf") {
    const { extractTextFromPdf } = await import("./pdf");
    return extractTextFromPdf(buffer);
  }

  throw new Error(
    `Unsupported file type: .${ext}. Please upload a PDF or DOCX resume.`
  );
}
