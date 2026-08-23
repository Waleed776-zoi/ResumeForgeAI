/**
 * Turns a cover letter string into something a typesetter can lay out.
 *
 * The model returns one blob of text with blank lines between paragraphs, but
 * a letter is not uniformly prose: the salutation and the sign-off are short
 * standalone lines, and running them through a justifying paragraph renderer
 * produces "Sincerely, Alex Mercer" stretched across six inches — the single
 * most obvious tell that a document was machine-typeset.
 *
 * So blocks are classified rather than treated alike. A block of short lines
 * (a salutation, an address, "Sincerely," over a name) keeps its line breaks
 * and is set flush left. Anything else is a paragraph: single newlines inside
 * it are soft wrapping from the model, not intent, so they collapse to spaces
 * and the renderer wraps to the real measure.
 *
 * Pure and renderer-agnostic, for the same reason resumeModel.ts is: the PDF
 * and DOCX exporters must not be able to disagree about what the letter says.
 */

export interface CoverLetterBlock {
  lines: string[];
  /** True for running prose (wrap and justify), false for a stacked block. */
  prose: boolean;
}

/** Longest a line can be and still read as a deliberate short line. */
const SHORT_LINE = 60;
/** More lines than this and it is prose that happens to be hard-wrapped. */
const MAX_STACKED_LINES = 4;

export function coverLetterBlocks(text: string): CoverLetterBlock[] {
  return (text ?? "")
    .replace(/\r\n?/g, "\n")
    .split(/\n[ \t]*\n+/)
    .map((block) =>
      block
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
    )
    .filter((lines) => lines.length > 0)
    .map((lines) => ({
      lines,
      prose: !(
        lines.length <= MAX_STACKED_LINES &&
        lines.every((line) => line.length <= SHORT_LINE)
      ),
    }));
}

/** The text of a block as the renderer should draw it, one entry per line. */
export function blockLines(block: CoverLetterBlock): string[] {
  return block.prose ? [block.lines.join(" ")] : block.lines;
}
